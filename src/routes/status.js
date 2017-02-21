var express = require('express');
var router = express.Router();
var pm2 = require('pm2');

router.get('/', function(req, res, next) {
    pm2.connect(function(err) {
        if (err) {
            res.render('status', {title: 'TeSLA Identity Provider', connected: false, message: err});
            return;
        }

        pm2.list(function (err, processDescriptionList) {
            if (err) {
                pm2.disconnect();
                res.render('status', {title: 'TeSLA Identity Provider', connected: false, message: err});
                return;
            }
            var info = [];
            processDescriptionList.forEach(function(proc) {
                info.push({name: proc.name, pid: proc.pid, pm_id: proc.pm_id, cpu: proc.monit.cpu, memory: proc.monit.memory, status: proc.pm2_env.status, exec_mode: proc.pm2_env.exec_mode, instances: proc.pm2_env.instances, created_at:proc.pm2_env.created_at});
            });

            res.render('status', {title: 'TeSLA Identity Provider', connected: true, data: info});
        });
    });
});

module.exports = router;
