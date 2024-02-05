async function batcher(r) {
    let rpcurl = await r.subrequest("/env/rpc-url");
    rpcurl = rpcurl.responseText;
    let batchsize = await r.subrequest("/env/batch-size");
    batchsize = parseInt(batchsize.responseText);
    if (isNaN(batchsize) || batchsize < 1) {batchsize = 1;}
    try {
        batcher_requests(r, rpcurl, batchsize);
    } catch (error) {
        r.error(error);
        let reply = await ngx.fetch(rpcurl, {method: r.method, headers: r.headersIn, body: r.requestBuffer});
        let text = await reply.text();
        r.return(reply.status, text);
    }
}

async function batcher_requests(r, rpcurl, batchsize) {
    let rpcArray = JSON.parse(r.requestText);
    let rpcChunks = [];

    let start = 0, stop = 0;
    while (true) {
        stop += batchsize;
        if (stop > rpcArray.length) {stop = rpcArray.length;}
        let arr = rpcArray.slice(start, stop);
        if (arr.length == 1) {rpcChunks.push(arr[0]);} else {rpcChunks.push(arr);}
        if (stop >= rpcArray.length) {break;}
        start = stop;
    }

    let results = await Promise.all(rpcChunks.map(async (chunk) => ngx.fetch(rpcurl, {method: "POST", headers: [['Content-Type', 'application/json']], body: JSON.stringify(chunk)})));

    let response = [];
    for (let i = 0; i < results.length; i++) {
        let arr = await results[i].json();
        if (Array.isArray(arr)) {
            for (let j = 0; j < arr.length; j++) {
                response.push(arr[j]);
            }
        } else {
            response.push(arr);
        }
    }
    r.headersOut['Content-Type'] = 'application/json';
    r.return(200, JSON.stringify(response));
}

export default {batcher};

