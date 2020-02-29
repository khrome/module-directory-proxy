var chai = require('chai');
var should = chai.should();
chai.use(require('chai-fs'));
var proxy = require('../proxy').proxy;
var install = require('../proxy').install;
var requirer = require('../proxy').require;
var lister = require('../proxy').list;
var ensurePackageDir = require('../proxy').ensurePackageDir;
var homedir = require('homedir');
var npm = require('npm-programmatic');
var home = homedir();
var cwd = __dirname;
var fs = require('fs');

var hiddenDir = cwd+'/.hidden/';

describe('proxy', function(){
    describe('programmatically', function(){
        before(function(done){
            fs.mkdir(hiddenDir, function(err){
                if(err) throw err;
                done();
            });
        });

        after(function(done){
            fs.rmdir(hiddenDir, {
                recursive:true
            }, function(err){
                if(err) throw err;
                done();
            });
        });

        it('proxies inside a hidden directory', function(done){
            proxy(cwd+'/.hidden/', cwd+'/', function(err, dir, finish){
                should.not.exist(err);
                dir.should.be.a.path();
                finish(function(){
                    dir.should.not.be.a.path();
                    done();
                });
            });
        });

        it('proxies to the users home directory', function(done){
            proxy(cwd+'/.hidden/', home+'/', function(err, dir, finish){
                should.not.exist(err);
                dir.should.be.a.path();
                finish(function(){
                    dir.should.not.be.a.path();
                    done();
                });
            });
        });

        it.skip('can use proxy to install modules to hidden directories', function(done){
            var hiddenDir = cwd+'/.hidden/';
            this.timeout(30000)
            ensurePackageDir(hiddenDir, function(err){
                should.not.exist(err);
                (hiddenDir+'package.json').should.be.a.path();
                proxy(hiddenDir, home+'/', function(err, dir, finish){
                    should.not.exist(err);
                    dir.should.be.a.path();
                    npm.install(['async-arrays'], {
                        cwd: dir,
                        output:true
                    }).then(function(){
                        (dir+'/node_modules/async-arrays').should.be.a.path();
                        finish(function(){
                            dir.should.not.be.a.path();
                            var modulesPath = cwd+'/.hidden/node_modules/';
                            var modulePath = modulesPath+'async-arrays';
                            (modulePath).should.be.a.path();
                            fs.rmdir(modulesPath, {
                                recursive:true
                            }, function(err){
                                should.not.exist(err);
                                setTimeout(function(){
                                    (modulePath).should.not.be.a.path();
                                    done();
                                }, 5000);
                            });
                        });
                    }).catch(function(err){
                        should.not.exist(err);
                    });
                });
            });
        });

        it('installs and queries NPMs to proxy directories', function(done){
            var hiddenDir = cwd+'/.hidden/';
            var proxyDir = home+'/';

            this.timeout(30000);
            var ins = install.from(hiddenDir, proxyDir);
            var rqr = requirer.from(hiddenDir, proxyDir);
            var ls = lister.from(hiddenDir, proxyDir);
            ins('async-arrays', function(err){
                should.not.exist(err);
                var arrays = rqr('async-arrays');
                should.exist(arrays);
                should.exist(arrays.forEachEmission);
                (typeof arrays.forEachEmission).should.equal('function');
                ls(function(err, modules){
                    should.not.exist(err);
                    modules.should.include('async-arrays');
                    modules.should.include('sift');
                    done();
                });
            });
        });
    });
});
