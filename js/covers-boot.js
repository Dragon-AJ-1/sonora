/* Must load BEFORE js/data.js — defines local covers so data.js can reference them */
(function(){
'use strict';
function __sonoraSvgCover(label,c1,c2,accent,sub,seed){
  seed=seed||0;sub=sub||'';
  var x1=20+(seed%40),y1=30+((seed*7)%50);
  function esc(s){return String(s||'').replace(/&/g,'&').replace(/</g,'<').replace(/"/g,'"');}
  var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="'+c1+'"/><stop offset="100%" stop-color="'+c2+'"/></linearGradient><radialGradient id="r" cx="'+x1+'%" cy="'+y1+'%" r="70%"><stop offset="0%" stop-color="'+accent+'" stop-opacity="0.35"/><stop offset="100%" stop-color="'+accent+'" stop-opacity="0"/></radialGradient></defs><rect width="400" height="400" fill="url(#g)"/><rect width="400" height="400" fill="url(#r)"/><circle cx="200" cy="175" r="54" fill="none" stroke="'+accent+'" stroke-width="1.5" opacity="0.85"/><circle cx="200" cy="175" r="18" fill="'+accent+'" opacity="0.9"/><text x="200" y="280" text-anchor="middle" fill="#F2EEE6" font-family="Georgia, serif" font-size="20" opacity="0.92">'+esc(label)+'</text>'+(sub?'<text x="200" y="308" text-anchor="middle" fill="#F2EEE6" font-family="monospace" font-size="11" opacity="0.45" letter-spacing="2">'+esc(sub).toUpperCase()+'</text>':'')+'</svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
window.__sonoraSvgCover=__sonoraSvgCover;
window.IMG={
 MS:__sonoraSvgCover('Midnight Signals','#0d0c0b','#2a241c','#6C8CFF','2026',1),
 AUR:__sonoraSvgCover('Aurora Vale','#12101a','#2a2540','#6C8CFF','Lisbon',2),
 NIA:__sonoraSvgCover('Nia Sol','#1a1208','#3d2e14','#D8A24A','London',3),
 SORA:__sonoraSvgCover('Sora June','#1a1014','#3a2430','#D98BA6','Tokyo',4),
 KAIRO:__sonoraSvgCover('Kairo Bloom','#1a0e08','#3d2418','#E07A4F','Accra',5),
 MILO:__sonoraSvgCover('Milo North','#0e1410','#1e2e24','#8FA98A','Oslo',6),
 ELIAS:__sonoraSvgCover('Elias Grey','#0c1216','#1a2a32','#7FA6B8','Reykjavik',7),
 VERA:__sonoraSvgCover('Vera Lune','#160c0c','#2e1818','#B84A4A','Paris',8),
 PC:__sonoraSvgCover('Paper Cities','#12100e','#2a2420','#D9A441','2023',9),
 WS:__sonoraSvgCover('Winter Songs','#0e1210','#1c2820','#8FA98A','EP',10),
 STUDIO:__sonoraSvgCover('Studio','#0a0908','#1e1a15','#D9A441','SONORA',11),
 TOKYO:__sonoraSvgCover('Tokyo','#100e16','#241e32','#D98BA6','After midnight',12),
 CLUB:__sonoraSvgCover('Club','#12080e','#2a1420','#E07A4F','Live',13),
 TAPE:__sonoraSvgCover('Tape','#12100c','#2a2418','#D9A441','Analog',14),
 SESSION:__sonoraSvgCover('Sessions','#0c0e12','#1a222c','#6C8CFF','018',15),
 ORB:__sonoraSvgCover('SONORA','#0A0908','#1E1A15','#D9A441','Listen deeper',0),
 HALL:__sonoraSvgCover('Hall','#0e0c0a','#221c16','#A8A297','Classical',16)
};
})();
