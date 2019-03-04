'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = setContact;
function setContact(_ref) {
  var name = _ref.name,
      email = _ref.email,
      rsvp = _ref.rsvp,
      dir = _ref.dir,
      partstat = _ref.partstat,
      role = _ref.role;

  var formattedAttendee = '';
  formattedAttendee += rsvp ? 'RSVP=TRUE;' : 'RSVP=FALSE;';
  formattedAttendee += role ? 'ROLE=' + role + ';' : '';
  formattedAttendee += partstat ? 'PARTSTAT=' + partstat + ';' : '';
  formattedAttendee += dir ? 'DIR=' + dir + ';' : '';
  formattedAttendee += 'CN=';
  formattedAttendee += name || 'Unnamed attendee';
  formattedAttendee += email ? ':mailto:' + email : '';

  return formattedAttendee;
}