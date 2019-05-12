/* eslint-env jquery, browser */
$(document).ready(() => {

  grecaptcha.ready(function() {
      site_key = "6LdBCKMUAAAAAET2cmGDXy6VbXgRhD041A0UT8As";
      key_2 = "6LdBCKMUAAAAALWAff6MPGU4tka0LRIEFe0yIbRE";
      grecaptcha.execute('reCAPTCHA_site_key', {action: 'homepage'}).then(function(token) {
         console.log(token);
      });
  });

  $("#follow-topic-button").hide();

  $(function () {
  	$('[data-toggle="tooltip"]').tooltip()
  })

  $(".tag-input").autocomplete({
    source: function (request, response) {
       $.ajax({
          url: "/tags/get-tags-autocomplete",
          type: "GET",
          data: request,  // request is the value of search input
          success: function (data) {
            console.log(request);
            source = $.map(JSON.parse(data), function (el) {
                return {
                    label: el.title
                  };
            });


            var term = $.ui.autocomplete.escapeRegex(request.term);
            var startsWithMatcher = new RegExp("^" + term, "i");
            var startsWith = $.grep(source, function(value) {
                  return startsWithMatcher.test(value.label || value.value || value);
            });
            var containsMatcher = new RegExp(term, "i")
            var contains = $.grep(source, function (value) {
                  return $.inArray(value, startsWith) < 0 &&
                      containsMatcher.test(value.label || value.value || value);
            });

            response(startsWith.concat(contains));
          }
        });
     },

     sortResults: true,
     // The minimum number of characters a user must type before a search is performed.
     minLength: 2,
     
     // set an onFocus event to show the result on input field when result is focused
     focus: function (event, ui) { 
        console.log(this);
        this.value = ui.item.label;
        // Prevent other event from not being execute
        event.preventDefault();

     },
     select: function (event, ui) {
        // Prevent value from being put in the input:
        this.value = ui.item.label;
        // Prevent other event from not being execute            
        event.preventDefault();
        // // optionnal: submit the form after field has been filled up
        console.log(event);
        // $('#quicksearch').submit();
     }
  });







    $("#all-tag-search").autocomplete({
    source: function (request, response) {
       $.ajax({
          url: "/tags/get-tags-autocomplete",
          type: "GET",
          data: request,  // request is the value of search input
          success: function (data) {
            console.log(request);
            source = $.map(JSON.parse(data), function (el) {
                return {
                    label: el.title
                  };
            });


            var term = $.ui.autocomplete.escapeRegex(request.term);
            var startsWithMatcher = new RegExp("^" + term, "i");
            var startsWith = $.grep(source, function(value) {
                  return startsWithMatcher.test(value.label || value.value || value);
            });
            var containsMatcher = new RegExp(term, "i")
            var contains = $.grep(source, function (value) {
                  return $.inArray(value, startsWith) < 0 &&
                      containsMatcher.test(value.label || value.value || value);
            });

            response(startsWith.concat(contains));
          }
        });
     },

     sortResults: true,
     // The minimum number of characters a user must type before a search is performed.
     minLength: 1,
     
     // set an onFocus event to show the result on input field when result is focused
     focus: function (event, ui) { 
        console.log("focusing on ",this);
        this.value = ui.item.label;
        loadNoticesForTag(ui.item.label);
        // Prevent other event from not being execute
        event.preventDefault();

     },
     select: function (event, ui) {
        console.log("select called");
        // Prevent value from being put in the input:
        this.value = ui.item.label;
        loadNoticesForTag(ui.item.label);
        // Prevent other event from not being execute            
        event.preventDefault();
        // // optionnal: submit the form after field has been filled up
        console.log(event);
        // $('#quicksearch').submit();
     }
  });



});

function loadNoticesForTag(title,tag_id){
  console.log("Getting notices for ",title);
  $.ajax({
      url: "/tags/get-linked-notices/"+title.replace("/","escapedSlash"),
      type: "GET",
      // data: {},  // request is the value of search input
      success: function (data) {
        console.log(data);
        data = JSON.parse(data);
        notices = data.tag.linkedNotices;
        console.log(notices);
        if (notices.length == 0){
          $("#tag-results").html("<div>It looks like there are no related notices to " + title +" yet. <br><br>Don't worry - choose another topic tag to see public notices related to it.</div>");
        } else {
          fullHTML = "<section class='row cards'>"
          notices.forEach(function (notice) {
            assigned_id = notice["assigned_id"];
            iscouncilor = data.iscouncilor;
            user = data.user;
            ntitle = notice["title"];
            ics = notice["ics"];

            card = '<div class="col-md-12"><div class="card-unset"><div class="card-header">'
                    + "<span class='tag-date-time'>" + notice.notice_date + "  at  " + notice.notice_time + "</span>"; 

            if (iscouncilor) {
              card += ' <a class="button-group" href="/meetings/edit/' + assigned_id + '">'
                + '<i class="fab fa fa-pencil-alt fa-sm"></i></a>';
            }

            card += '<a class="button-group" href="/meetings/download-ics/' 
                    + ics 
                    + '"><i class="fab fa fa-calendar-plus fa-sm"></i><span>Export</span></a>';

            if (user){
              // if (unfollow) {
              //   card += '<a class="button-group" href="/meetings/unfollow-meeting/' 
              //       + assigned_id
              //       + '"><i class="fab fas fa-bell-slash fa-sm"></i><span>Unfollow</span></a>';
              //   card += ""
              // }
              // else {
              card += '<a class="button-group" href="/meetings/follow-meeting/' 
                  + assigned_id
                  + '"><i class="fab fas fa-bell fa-sm"></i><span>Subscribe</span></a>';
              // }
            }
            if (!user) {
              card += '<a class="button-group" href="' + '/login' + '"><i class="fab fas fa-bell fa-sem"></i><span>Subscribe</span></a>';
            }
          
            card += '</div>'
                  + '<a href="/meetings/expanded-meeting/' + assigned_id + '">'
                  + '<div class="card-content">'
                  + '<h5>' + ntitle + '</h5>'
                  + '</div></a></div></div>'
            fullHTML += card;
        });
        fullHTML += "</section">
        $("#tag-results").html(fullHTML);
      }
      $(".tag").removeClass("active-tag")
      $("#"+tag_id).addClass("active-tag");
      $("#follow-topic-button").show();
      $("#follow-topic").attr("href", "/tags/follow-tag/"+title.replace("/","escapedSlash"));
      $("#topic-name").text(title);
    }
  });
}

