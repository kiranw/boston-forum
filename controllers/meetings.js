const request = require('request');

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
      // n["body"] = n.body.replace(/(\<.*?\>)/, "");
      return n;
    });
    res.render('meetings/public-notices', {
      title: 'Public Notices API',
      notices: notices_cleaned
    });
  });
};
