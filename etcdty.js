#!/usr/bin/env node

var _      = require('lodash')
var join   = require('path').join
var spawn  = require('child_process').spawn
var Etcd   = require('node-etcd')
var argv   = require('minimist')(process.argv.slice(2))

var HOST   = argv['etcd-host'] || process.env.ETCD_HOST || 'localhost'
var PORT   = argv['etcd-port'] || process.env.ETCD_PORT || 4001

var etcd   = new Etcd(HOST, PORT)

var path   = argv.path
var args   = argv._
var exec   = args.shift()

if (!path || exec.length === 0)
  abort()
else
  main()

return //------------------

function abort() {
  console.error('Usage: etcd-init --path=ETCD_PATH -- APP COMMANDS')
  process.exit(1)
}

function main() {
  var service = path
  var lastEnv = {}

  function exit(code, signal) {
    console.log('Process Exited', code, signal)
  }

  etcd.get(service, function (err, data) {
    var node
    if (err) {
      node = {}
    }
    else try {
      node = JSON.parse(data.node.value)
    }
    catch (e) {
      node = lastEnv
    }

    run(err, node)
    .on('exit', exit)

    lastEnv = node
  })

  function wait(i) {
    etcd.watch(service, {waitIndex: i}, function (err, data) {
      var node
      if (err) {
        node = {}
      }
      else try {
        node = JSON.parse(data.node.value)
      } catch (e) {
        node = lastEnv
      }

      var same = _.isEqual(lastEnv, node)

      if (same) {
        console.log('Config Unchanged')
      }
      else run(err, node).on('exit', exit)

      setImmediate(wait, data.node.modifiedIndex + 1)

      lastEnv = node
    })
  }

  wait(0)
}

function run(err, data) {
  var envs = _.clone(process.env)

  if (data) {
    envs = _.merge(envs, data)
  }

  var proc = spawn(exec, args, {
    stdio : 'pipe',
    env   : envs
  })

  proc.stdout.pipe(process.stdout)
  proc.stderr.pipe(process.stderr)

  return proc
}
