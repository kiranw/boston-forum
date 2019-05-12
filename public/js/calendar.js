document.addEventListener('DOMContentLoaded', function() {
  function getCalendarData(){
    $.ajax({
      url: "/meetings/get-calendar-meetings/",
      type: "GET",
      // data: {},  // request is the value of search input
      success: function (data) {
        console.log("happening");
        console.log(data);
        var calendarEl = document.getElementById('calendar');
        
        newData = JSON.parse(data);
        console.log(newData);

          var calendar = new FullCalendar.Calendar(calendarEl, {
              plugins: [ 'interaction', 'dayGrid', 'timeGrid'],
              header: {
                left: 'prev,today,next',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              },
              defaultDate: new Date().toISOString().substr(0,10),
              defaultView: 'dayGridMonth',
              navLinks: true, // can click day/week names to navigate views
              eventLimit: true, // allow "more" link when too many events
              events: newData
              // events: [
              //   {
              //     title: 'Long Event',
              //     start: '2019-04-07',
              //     end: '2019-04-10'
              //   },
              //   {
              //     title: 'Click for Google',
              //     url: 'http://google.com/',
              //     start: '2019-04-28'
              //   }
              // ]
            });
            $(".loading-gif").hide();
            calendar.render();

      }
    });  
  }
  getCalendarData();
});
