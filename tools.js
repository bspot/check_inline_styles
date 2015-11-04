
var Progress = function(name, total) {
  var in_progress = 0;
  var done = 0;

  var update_display = function() {
    process.stdout.write(name + ": " + done + " / " + in_progress + " / " + total + "\r");
  };

  return function() {
    in_progress++;
    update_display();
    return function() {
      done++;
      in_progress--;
      update_display();
    }
  };
};

module.exports.Progress = Progress;
