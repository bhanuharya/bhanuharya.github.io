
//GSAP

TweenMax.to("#box", 0.5, {opacity:1},0.5);

var lines = $('path');
var none = "transparent"

tl = new TimelineMax({delay: 0.5, repeat:-1});
tl.timeScale(1.7);
tl.staggerFrom(lines, 0.8, {stroke:none,fill: none, drawSVG:"60% 60%",ease: Power1.easeOut},0.6);
tl.staggerTo(lines, 1.8, {stroke:none,fill: none, drawSVG:"50% 50%",ease: Power1.easeOut},0.03);

//AUDIO

var song = $('audio');

song.prop('volume', 0.5);
song.prop("muted", true);
$('#mute').click(function() {
    if (song.prop("muted") == true) {
      song.prop("muted", false);
    }
    else {
      song.prop("muted", true);
    }
  });

//Joy Division - Unknown Pleasures 1979
//Peter Saville - Album Artwork

//Data Visualization Reinterpreted
//VIMEO.COM/51365288

//Resource
//thingiverse.com/thing:92971
