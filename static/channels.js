var existing_channels = [];
var existing_users = [];
var gl_curchannel;
let displayname = localStorage.getItem('displayname');

function clickhandler(chn) {
    // unweight the previous channel
    document.getElementById(gl_curchannel).style.fontWeight = "normal";

    gl_curchannel =  chn;
    let hdr = document.getElementById("message_header");

    // weight font on the new channel
    document.getElementById(gl_curchannel).style.fontWeight = "bold";

    hdr.innerHTML = " Messages on " + gl_curchannel + " channel";
    localStorage.setItem("channel", gl_curchannel);
    configure_msgs(gl_curchannel);
}

function dm_clickhandler(usr) {
    let hdr = document.getElementById("message_header");
    console.log ("dm_clickhandler: usr = ", usr);

    // weight font on the new channel
    document.getElementById(usr).style.fontWeight = "bold";

    if (usr == displayname) {
	hdr.innerHTML = " Direct Messages for " + usr;
	configure_msgs(usr);
    }
}


// Add a channel to the list.  
function add_channel(chn, selected) {
    const new_chn_row = document.createElement('TR');
    var c = new_chn_row.insertCell(-1);

    c.innerHTML = chn;
    c.setAttribute("id", chn);
    c.setAttribute("class", "channel-listing");
    c.setAttribute("data-channel", chn);

    let chntrow = chn + "row"
    new_chn_row.setAttribute("id", chntrow);
    new_chn_row.setAttribute("class", "channel-listing");
    new_chn_row.setAttribute("data-channel", chn);
    existing_channels.push(chn);

    var emnt = new_chn_row.querySelector("td");
    emnt.addEventListener("click", function() { clickhandler (chn); });
    document.getElementById('hoverTable').append(new_chn_row);
    if (selected == 1) {
	console.log ("add_channel: selecting ", chn);
	clickhandler(chn);
    }
}

// Add a user to the list.  
function add_user(usr) {
    const new_usr_row = document.createElement('TR');
    var c = new_usr_row.insertCell(-1);

    c.innerHTML = usr;
    c.setAttribute("id", usr);
    c.setAttribute("class", "user-listing");
    c.setAttribute("data-user", usr);

    let usrtrow = usr + "row"
    new_usr_row.setAttribute("id", usrtrow);
    new_usr_row.setAttribute("class", "user-listing");
    new_usr_row.setAttribute("data-user", usr);
    existing_users.push(usr);

    var emnt = new_usr_row.querySelector("td");
    emnt.addEventListener("click", function() { dm_clickhandler (usr); });
    document.getElementById('user_list').append(new_usr_row);
}

function configure_channels() {
    // Get List of Channels
    const request = new XMLHttpRequest();
    request.open('POST', '/query_channels');
	 
    console.log ("[1] configure_channels: gl_curchannel = ", gl_curchannel);
    if (localStorage.getItem('channel')) {
	gl_curchannel = localStorage.getItem('channel');
    }
    else {
	gl_curchannel = "General";
    }
    console.log ("[2] configure_channels: gl_curchannel = ", gl_curchannel);
    // Callback function for when request completes
    request.onload = () => {

	// Extract JSON data from request
	const data = JSON.parse(request.responseText);
		
	// Extract list of channels and populate variable and dropdown menu
	if (data.success) {
	    var channels = data["channel_list"];
	    for (var i = 0, len = channels.length; i < len; i++) {
		if (channels[i] == gl_curchannel){
		    add_channel(channels[i], 1);
		}
		else {
		    add_channel(channels[i],0);
		}
	    }
	}
	else {
	    console.log("API call failed");
	}
    }

    // Send request
    request.send();
}

// Add a message to the displayed message list.  
function add_message(msg) {
    const new_row = document.createElement('TR');
    var c = new_row.insertCell(0);

    let ts = "<font class='tstamp'>" + msg["timestamp"] + "</font>";
    let dn = " <font class='dname'> @" + msg["user_from"] + "</font><br>";

    let n_msg = ts + dn + msg["msg_txt"];
    c.innerHTML = n_msg;
    document.getElementById('message_list').append(new_row);
}

// Clear messages when switching channels
function clear_messages() {
    var myNode = document.getElementById('message_list');

    while (myNode.firstChild) {
	myNode.removeChild(myNode.firstChild);
    }
}

// Clear user list
function clear_users() {
    var myNode = document.getElementById('user_list');

    while (myNode.firstChild) {
	myNode.removeChild(myNode.firstChild);
    }
}
function configure_msgs(chn) {
    // Clear out old message list
    clear_messages();

    // Get Messages on this channel

    const request = new XMLHttpRequest();
    request.open('POST', '/query_messages');
	    
    // Callback function for when request completes
    request.onload = () => {

	// Extract JSON data from request
	const data = JSON.parse(request.responseText);
		
	// Extract dictionary of messages and populate message pane
	if (data.success) {
	    console.log ("configure_msgs: success.  messages =", data["channel_msgs"])
	    var messages = data["channel_msgs"];
	    for (var i = 0, len = messages.length; i < len; i++) {
		add_message(messages[i]);
	    }
	}
    }

    // Add data to send with request for messages on this channel
    const data = new FormData();
    data.append('channel', chn);
    data.append('username', displayname);

    // Send request
    request.send(data);
    return false;
}

function configure_users() {
    // Clear out old user list
    console.log ("configure_users: arrived");
    clear_users();

    // Get active users

    const request = new XMLHttpRequest();
    request.open('POST', '/query_users');
	    
    // Callback function for when request completes
    request.onload = () => {

	console.log ("configure_users: completed request");
	// Extract JSON data from request
	const data = JSON.parse(request.responseText);
		
	// Extract dictionary of messages and populate message pane
	if (data.success) {
	    var users = data["active_users"];
	    console.log ("configure_users: users = ", users);
	    for (var i = 0, len = users.length; i < len; i++) {
		if (users[i] != displayname) {
		    console.log ("configure:users: adding ", users[i]);
		    add_user(users[i]);
		}
	    }
	}
	else {
	    console.log("API query users failed");
	}
    }

    // Add data to send with request for messages on this channel
    //const data = new FormData();
    //data.append('channel', chn);
    //data.append('username', displayname);

    // Send request
    request.send();
    return false;
}

document.addEventListener('DOMContentLoaded', () => {

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // Get/Set displayname
    let dn = document.getElementById("dname").innerHTML;
    if (dn != displayname) {
	displayname = dn;
	localStorage.setItem("displayname", dn);
    }

    socket.on('connect', () => {
	    var id = socket.io.engine.id;

	    console.log("socket is ", socket.io.engine.id);
	    socket.emit ("join", {"displayname": displayname, "room": id});
	    configure_channels();
	    configure_users();
	});


    // By default, submit buttons are disabled
    document.getElementById('submit').disabled = true;
    document.getElementById('msg_submit').disabled = true;
    document.getElementById('dm_submit').disabled = true;

    // Enable button only if there is text in the input field
    document.getElementById('channel_name').onkeyup = () => {
	if (document.getElementById('channel_name').value.length > 0)
	    document.getElementById('submit').disabled = false;
	else
	    document.getElementById('submit').disabled = true;
    };

    document.getElementById('message_text').onkeyup = () => {
	if (document.getElementById('message_text').value.length > 0)
	    document.getElementById('msg_submit').disabled = false;
	else
	    document.getElementById('msg_submit').disabled = true;
    };

    document.getElementById('direct_message').onkeyup = () => {
	if (document.getElementById('direct_message').value.length > 0)
	    document.getElementById('dm_submit').disabled = false;
	else
	    document.getElementById('dm_submit').disabled = true;
    };

    // Set the dislayname
    document.getElementById("new_channel").onsubmit = () => {
	    
	var chn  = document.getElementById('channel_name').value;

	if (existing_channels.includes(chn)) {
	    alert ("Channel already exists");
	}
	else {
	    document.getElementById('channel_name').value = "";
	    document.getElementById('submit').disabled = true;
	    socket.emit('submit channel', {'channel': chn});
	}
	return false;
    };
    document.getElementById("new_dmessage").onsubmit = () => {
	    
	var dm_user  = document.getElementById('dm_recipient').value;
	var dm_text = document.getElementById('direct_message').value;

	document.getElementById('direct_message').value = "";
	document.getElementById('dm_submit').disabled = true;
	socket.emit('submit dm', {'dm_to': dm_user, "dm_from": displayname, "dm_text": dm_text});
	return false;
    };

	    
    // When a new channel is announced, add to the channel list
    socket.on('announce channel', data => {
	    add_channel(data["channel"], 0);
	});

    socket.on('new user', data => {
	    // Don't add self twice
	    //	    if (data["username"] != displayname) {
	    console.log("Adding new user", data["username"], ". displayname is ", displayname);
	    add_user(data["username"]);
		//};
	});

    // When a new message is announced, add to the message list
    socket.on('announce message', data => {
	    if (data["channel"] == gl_curchannel) {
		add_message(data);
	    }
    });

    document.getElementById("new_message").onsubmit = () => {
	    
	var val  = document.getElementById('message_text').value;
	var dt = new Date();
	var dn = document.getElementById('displayname').value;

	document.getElementById('message_text').value = "";
	document.getElementById('msg_submit').disabled = true;
	socket.emit('submit message', {'msg_txt': val, 'channel': gl_curchannel,'timestamp': dt, 'user_from': displayname, "user_to": ""});
	return false;
    };
    });

