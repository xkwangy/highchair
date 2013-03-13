An EC2 attribute query tool. Highchair lets you quickly get information about the EC2s you have running and filter based on certain metadata.

## Examples

Highchair supports [EC2 tags](http://docs.amazonwebservices.com/AWSEC2/latest/UserGuide/Using_Tags.html)
as filters and output. The examples below assume you have tagged some EC2
instances with `Cluster` tag.

Get the hostname of instances with the `Cluster` tag set to `production`:

    node index.js --config config.json metadata --attribute dnsName --filter.Cluster production

Output the cluster name for instance `i-5h39fjk`:

    node index.js --config config.json metadata --attribute Cluster --filter.instanceId i-5h39fjk

If you run the command from an EC2 instance, you can swap `_self` in for an actual Cluster tag value
and the Cluster tag value of the current instance will be used.

Get the hostname of all instances in the same Cluster as me:

    node index.js --config config.json metadata --attribute dnsName --filter.Cluster _self

You can use multiple filters at once. This will list the hostanme for all database servers in the staging Cluster.

    node index.js --config config.json metadata --attribute dnsName --filter.Cluster staging --filter.Class database-server
