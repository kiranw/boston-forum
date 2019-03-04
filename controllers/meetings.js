const { writeFileSync } = require('fs')
const request = require('request');
const ics = require('ics')


/**
 * GET /meetings/download-ics/:event
  Download calendar file for a public notice event
 */
exports.downloadIcs = (res, params) => {
  res.download(params.event);
};


function prepareIcs(event, eventId){
  ics.createEvent(event, (error, value) => {
      if (error) {
        console.log(error)
        return;
      }
      writeFileSync('Boston_Public_Notice_'+eventId+'.ics', value);
  })
  return 'Boston_Public_Notice_'+eventId+'.ics';
}


/**
 * GET /meetings/public-notices
  Boston public notices
 */
exports.getPublicNotices = (req, res, next) => {
  request.get({ url: 'https://www.boston.gov/api/v2/public-notices' }, (err, request, body) => {
    if (err) { return next(err); }
    if (request.statusCode >= 400) {
      return next(new Error(`Boston Government API - ${body}`));
    }
    var notices = JSON.parse(JSON.parse(JSON.stringify(body)));

    
    var notices_cleaned = notices.map(function(n){
      n["url"] = "https://www.boston.gov" + n.title.match(/\<a href\=\"(.*?)\"\>/)[1];
      n["title"] = n.title.match(/\>(.*?)\</)[1];
      n["body"] = n.body.replace(/(\<.*?\>)/g, "");

      const event = {
        start: [2018, 5, 30, 6, 30],
        duration: { hours: 6, minutes: 30 },
        title: n["title"],
        description: n["body"],
        location: n["location_name"] + "; " + n["location_room"] + "; " + n["location_street"],
        url: n["url"],
        categories: ['Boston Local Government', 'Public Notice', 'Boston'],
        status: 'CONFIRMED'
      }
      n["ics"] = prepareIcs(event, n.id);
      return n;
    }); 

    res.render('meetings/public-notices', {
      title: 'Public Notices API',
      notices: notices_cleaned
    });
  });
};
