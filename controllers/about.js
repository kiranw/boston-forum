const nodemailer = require('nodemailer');
const User = require('../models/User')

/**
 * GET /contact
 * Contact form page.
 */
exports.getContact = (req, res) => {
  const unknownUser = !(req.user);
  isCouncilor = checkCouncilorRole(res, req.user);
  Promise.resolve(isCouncilor).then(function(isCouncilorBoolean){
    res.render('about', {
      title: 'About',
      unknownUser,
      iscouncilor: isCouncilorBoolean
    });
  });
};

/**
 * POST /contact
 * Send a contact form via Nodemailer.
 */
exports.postContact = (req, res) => {
  let fromName;
  let fromEmail;
  if (!req.user) {
    req.assert('name', 'Name cannot be blank').notEmpty();
    req.assert('email', 'Email is not valid').isEmail();
  }
  req.assert('message', 'Message cannot be blank').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/about');
  }

  if (!req.user) {
    fromName = req.body.name;
    fromEmail = req.body.email;
  } else {
    fromName = req.user.profile.name || '';
    fromEmail = req.user.email;
  }

  let transporter = nodemailer.createTransport({
    service: 'SendGrid',
    auth: {
      user: process.env.SENDGRID_USER,
      pass: process.env.SENDGRID_PASSWORD
    }
  });
  const mailOptions = {
    to: 'your@email.com',
    from: `${fromName} <${fromEmail}>`,
    subject: 'Contact Form | Hackathon Starter',
    text: req.body.message
  };

  return transporter.sendMail(mailOptions)
    .then(() => {
      req.flash('success', { msg: 'Email has been sent successfully!' });
      res.redirect('/about');
    })
    .catch((err) => {
      if (err.message === 'self signed certificate in certificate chain') {
        console.log('WARNING: Self signed certificate in certificate chain. Retrying with the self signed certificate. Use a valid certificate if in production.');
        transporter = nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            user: process.env.SENDGRID_USER,
            pass: process.env.SENDGRID_PASSWORD
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        return transporter.sendMail(mailOptions);
      }
      console.log('ERROR: Could not send contact email after security downgrade.\n', err);
      req.flash('errors', { msg: 'Error sending the message. Please try again shortly.' });
      return false;
    })
    .then((result) => {
      if (result) {
        req.flash('success', { msg: 'Email has been sent successfully!' });
        return res.redirect('/about');
      }
    })
    .catch((err) => {
      console.log('ERROR: Could not send contact email.\n', err);
      req.flash('errors', { msg: 'Error sending the message. Please try again shortly.' });
      return res.redirect('/about');
    });
};




// Check if a user is a councilor
function checkCouncilorRole(res, user){   
  if (!user){
    return new Promise((resolve,reject) => {
      resolve(false);
    }); 
  }
  else {
    emailString = user.email
    return new Promise((resolve, reject) => {
      User.findOne({email: emailString}).exec(function(err, user){
        if (err) {
          console.log("ERROR IN CHECKING COUNCILOR")
          resolve(false);
        }
        else {
          console.log("IS A COUNCILOR: ",user.roles.includes("councilor"));
          resolve(user.roles.includes("councilor"));
        }
      });
    });
  }
}
