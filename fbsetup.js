// fbsetup.js — API layer. This file provides a stable `fb*` API
// and delegates to the implementation in `firebase.js`.

function _ensureImpl() {
	console.log('[FBSETUP] ensureImpl');
	if (!window.firebaseSubmitScore || !window.firebaseFetchTopScores) {
		console.warn('firebase.js not loaded or missing implementations. Ensure firebase.js is included before fbsetup.js');
	}
}

window.fbSubmitScore = async function(name, score) {
	console.log('[FBSETUP] fbSubmitScore wrapper', { name, score });
	_ensureImpl();
	if (window.firebaseSubmitScore) return window.firebaseSubmitScore(name, score);
	throw new Error('No Firebase implementation available');
};


