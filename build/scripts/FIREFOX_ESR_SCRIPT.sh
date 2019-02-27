echo '{
    "aggs": {
        "buildid": {
            "terms": {
                "field": "build.id",
                "size": 1000
            }
        }
    },
    "query": {
        "bool": {
            "filter": [
                {
                    "term": {
                        "source.product": "firefox"
                    }
                }, {
                    "term": {
                        "target.channel": "esr"
                    }
                }
            ]
        }
    },
    "size": 0
}' | curl https://buildhub.prod.mozaws.net/v1/buckets/build-hub/collections/releases/search --data @- | jq -r '.aggregations.buildid.buckets[].key' | sort -u
