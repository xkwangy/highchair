// A tool for working with swarms of MapBox servers.

var Step = require('step');
var _ = require('underscore');
var fs = require('fs');
var instanceMetadata = require('./lib/instance-metadata');
var ec2Api= require('./lib/ec2-api');

var optimist = require('optimist')
    .usage('A tool for working with swarms of MapBox servers.\n' + 'Usage: $0 [options]')
    .describe('config', 'Path to JSON configuration file that contains awsKey and awsSecret.')
    .describe('attribute', 'The EC2 API instance attribute to load from the swarm. Required for the metadata command.')
    .describe('filter', 'Provide filters specified like --filter.<attribute> to limit results.')
    .describe('awsKey', 'awsKey, overrides the value in gconfig file if both are provided.')
    .describe('awsSecret', 'awsSecret, overrides the value in config file if both are provided.')
    .default('attribute', 'instanceId')
    .default('regions', 'us-east-1,us-west-1,us-west-2,eu-west-1,ap-southeast-1,ap-northeast-1,sa-east-1')
    .demand(['awsKey', 'awsSecret'])
    .config('config');
var argv = optimist.argv;

if (argv.help) {
    optimist.showHelp(console.log);
    process.exit(0);
}

var regions = argv.regions.split(',');

var run = function(options) {
    Step(function() {
        ec2Api.loadInstances(ec2Api.createClients(options, regions), options.filter, this);
    }, function(err, instances) {
        if (err) throw err;
        var possibleAttr = _(instances).chain()
            .map(function(instance) { return _(instance).keys(); })
            .flatten()
            .uniq()
            .value();
        if (instances.length && !_(possibleAttr).include(options.attribute)) {
            optimist.showHelp();
            console.error('Invalid attribute %s.\n\nAvailable attributes are:\n%s',
                options.attribute, possibleAttr.join(', '));
            process.exit(1);
        }
        if (!instances.length) console.log("");
        else {
            console.log(_(instances).chain()
                .pluck(options.attribute)
                .compact()
                .filter(_.isString)
                .uniq()
                .value()
                .join('\n'));
        }
    });
}

// If any supported arguments have the `_self` value we resolve then first, and
// then actually run the command.
Step(function() {
    // --filter.instanceId _self
    if (argv.filter && argv.filter.instanceId == '_self') {
        var next = this;
        instanceMetadata.loadId(function(err, id) {
            if (err) next(err);
            argv.filter.instanceId = id;
            next();
        });
    }
    else { this() }
}, function(err) {
    if (err) throw err;
    // --filter.TAG _self
    var lookup = _(argv.filter).chain().map(function(v, k) {
        if (v == '_self') return k;
    }).compact().value();

    if (!lookup) return this();

    var tagCache;
    var group = this.group();
    _(lookup).each(function(key) {
        var next = group();
        Step(function() {
            instanceMetadata.loadId(this.parallel())
            instanceMetadata.loadAz(this.parallel());
        }, function(err, id, az) {
            if (err) throw (err);
            if (tagCache) return this(null, tagCache);
            var filters = {'resource-type': 'instance', 'resource-id': id};
            ec2Api.loadTags(ec2Api.createClients(argv, [az.region]), filters, this);
        }, function(err, tags) {
            if (err) return group(err);
            tagCache = tags;
            argv.filter[key] = _(tags).find(function(v){
               return v.key == key;
            }).value;
            next();
        });
    });

}, function(err) {
    if (err) throw err;
    // --regions _self
    var i = regions.indexOf('_self');
    if (i !== -1) {
        var next = this;
        instanceMetadata.loadAz(function(err, az) {
            if (err) next(err);
            regions[i] = az.region;
            next();
        });
    }
    else { this() }
}, function(err) {
    if (err) throw err;
    run(argv);
});
