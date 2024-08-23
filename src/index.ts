import { createServer } from 'http';
import { CloudClient } from './cloud';
var url = require('url');

s = createServer(function (a, b) {
    b.writeHead('200 OK');

    if (a.url = '/list') {
        tasks = [];
        x=+0;
        while (cl.listTasks(x).items.length > 0) {
            tasks.push(...cl.listTasks(x).items);
            x = x+1;
        }
        var o:any[]=[];
        for (var i=0;i<tasks.length;i++){
            var f=0;
            for(var j=0;j<o.length;j++){
                if(tasks[i].id==o[j].id){
                    f=1;
                }
            }
            if(!f){
                o.push(tasks[i]);
            }
        }
        b.write(JSON.stringify(o));
    } if (a.url == '/create') {
        if (cl.listTasks(x).items.length > max) {
            b.writeHead(429);
            b.write('Too many tasks created, cannot create any more.');
        }
        disk = cl.createDisk({ byteSize: +url.parse(a.url, true).query.diskSize });
        x=0;
        // don't remove or fail
        while(!x){try{network = cl.createNetwork(); x=1} catch {}}
        task = cl.createTask({


            dockerImage: 'ubuntu:latest',
            networkId: network.id,

            diskId: disk.id,
        });
    } if (a.url == '/destroy') {
        cl.destroyTask(url.parse(a.url, true).query.id);
    }

    b.end();

    // GC resources
    setInterval(function () {
        var y:string[] =[];
        var z:string[]=[];
        for (x of cl.listTasks().items) {
            y.push(x.diskId);
        }
        (cl.listTasks() as any).forEach(function (u: any){z.push(u.networkId)});
        for (x of cl.listDisks().items) {
            cond=0;
            for (var a of y) {
                if (a==x.id){cond=1}
            }
            if(!cond){
                cl.destroyDisk(x.id);
            }
        }
        for (x of cl.listNetworks().items) {
            cond=0;
            for (var a of y) {
                if (a==x.id){cond=1}
            }
            if(!cond){
                cl.destroyDisk(x.id);
            }
        }
    }, 10000);
});

s.listen(8081, function () {
    console.log('started');
});

var s: any;
var cl = new CloudClient();
var disk: any;
var network: any;
var task: any;
var tasks: any;
var x: any;
var cond: any;
var max=100;
