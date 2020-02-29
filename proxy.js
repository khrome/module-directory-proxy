var uuid = require('uuid');
var fs = require('fs');
var npm = require('npm-programmatic');
var asynk = require('async');

var batch = function(dir, proxyDir, moduleName, action, cb){
    var results = [];
    asynk.eachOfSeries(
        moduleName,
        function(name, index, done){
            action(name, function(err, result){
                results[index] = result;
                done();
            });
        }, function(){
            results.unshift(undefined); // no error
            cb.apply(cb, results)
        }
    )
}

var proxyOperation = function(dir, proxyDir, name, operation, cb){
    //todo: optimize batches
    var results = [];
    control.ensurePackageDir(dir, function(err){
        if(Array.isArray(name)){
            return batch(dir, proxyDir, name, operation, cb);
        }
        control.proxy(dir, proxyDir, function(err, proxiedDir, finish){
            operation(proxiedDir, function(result, cb){
                finish(cb);
            });
        });
    });
}

var control = {
    defaultPackage : {
        name : 'dummy-module',
        version:'0.0.1-alpha'
    },
    debug: false,
    promise : function(){

    },
    install : function(dir, proxyDir, name, cb){
        //todo: optimize batches
        proxyOperation(dir, proxyDir, name, function(proxiedDir, finish){
            npm.install([name], {
                cwd: proxiedDir,
                output: control.debug
            }).then(function(){
                finish(true, function(){
                    return cb();
                });
            }).catch(function(err){
                return cb(err);
            });
        }, cb);
    },
    list : function(dir, proxyDir, cb){
        //todo: optimize batches
        fs.readdir(dir+'node_modules', function(err, files){
            if(err) return cb(err);
            return cb(undefined, files);
        });
    },
    require : function(dir, moduleName, cb){
        if(Array.isArray(moduleName)){
            return moduleName.map(function(name){
                return require(dir+'node_modules/'+name);
            });
        }else return require(dir+'node_modules/'+moduleName);
    },
    proxy : function(dir, proxyDir, cb){
        var dirName = proxyDir+uuid.v4();
        fs.symlink(dir, dirName, function(err){
            if(err) return cb(err);
            cb(undefined, dirName, function(innerCb){
                fs.unlink(dirName, function(err){
                    if(innerCb) innerCb(err);
                });
            });
        });
    },
    ensurePackageDir:function(dir, cb){
        var packageName = dir+'package.json';
        fs.stat(packageName, function(err, stats){
            if(err){
                fs.writeFile(
                    packageName,
                    JSON.stringify(module.exports.defaultPackage),
                    function(err){
                        cb(err);
                    }
                )
            }else return cb();
        })
    }
}

control.install.from = function(dir, proxyDir){
    return function(name, cb){
        return control.install(dir, proxyDir, name, cb)
    }
}

control.install.promise = function(dir, proxyDir){
    return function(name){
        return new Promise(function(resolve, reject){
            try{
                return control.install(dir, proxyDir, name, function(err, result){
                    resolve(result);
                });
            }catch(ex){
                cb(ex);
            }
        });
    }
}

control.require.from = function(dir, proxyDir){
    return function(name){
        return control.require(dir, name)
    }
}

control.list.from = function(dir, proxyDir){
    return function(cb){
        return control.list(dir, proxyDir, cb)
    }
}

control.require.promise = function(dir, proxyDir){
    return function(name){
        return new Promise(function(resolve, reject){
            try{
                return resolve(control.require(dir, name));
            }catch(ex){
                cb(ex);
            }
        });
    }
}

module.exports = control;
