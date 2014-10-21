#!/usr/bin/env node

var _      = require('lodash')
var join   = require('path').join
var spawn  = require('child_process').spawn
var Etcd   = require('node-etcd')
var argv   = require('minimist')(process.argv.slice(2))

var HOST   = argv['etcd-host']   || process.env.ETCD_HOST   || 'localhost'
var PORT   = argv['etcd-port']   || process.env.ETCD_PORT   || 4001
var PREFIX = argv['etcd-prefix'] || process.env.ETCD_PREFIX || '/envs'

var etcd   = new Etcd(HOST, PORT)

var name   = argv.name
var exec   = argv._

if (!name || exec.length === 0)
  abort()
else
  main()

return //------------------

function abort() {
  console.error('this is bad')
  process.exit(1)
}

function main() {
  var service = join(PREFIX, name)
  etcd.get(service, function(err, data) {
    var envs = _.clone(process.env)

    if (data) {
      envs = _.merge(envs, JSON.parse(data.node.value))
    }

    var proc = spawn(exec.shift(), exec, {
      stdio : 'pipe',
      env   : envs
    })

    proc.stdout.pipe(process.stdout)
    proc.stderr.pipe(process.stderr)

    proc.on('exit', function(code, signal) {
      if (code !== 0)
        process.exit(code || -1)
      }
    })
  })
}
