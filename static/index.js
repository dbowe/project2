// Initialize display name
let displayname = localStorage.getItem('displayname');
console.log ("displayname at initialization: ", displayname);
if (displayname == null) {
    localStorage.setItem('displayname', "");
}

document.addEventListener('DOMContentLoaded', () => {

	if (displayname == "") {
	    document.querySelector("#welcome").innerHTML = "Welcome! Please create a display name to access chat rooms";
	}
	else {
	    let welcomestr = "Welcome back " + displayname + ". Press sign in to proceed.";
	    document.querySelector("#welcome").innerHTML = welcomestr;
	    document.querySelector("#dname_field").value = displayname;
	}
    // By default, submit button is disabled
    if (document.getElementById('dname_field').value.length == 0)
	document.getElementById('signin').disabled = true;

    // Enable button only if there is text in the input field
    document.getElementById('dname_field').onkeyup = () => {
	if (document.getElementById('dname_field').value.length > 0)
	    document.getElementById('signin').disabled = false;
	else
	    document.getElementById('signin').disabled = true;
    };

   return false;

    });
