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
                info.push({name: proc.name, pid: proc.pid, pm_id: proc.pm_id, cpu: proc.monit.cpu, memory: proc.monit.memory});
            });

            res.render('status', {title: 'TeSLA Identity Provider', connected: true, data: info});
        });
    });
});

module.exports = router;
