import os

from flask import Flask, render_template, request, jsonify, Response
import random, json, time, datetime
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Arrays of channel names and active users
channel_list = ["General"]
user_list = []

# Dictionary of users & messages
user_dm_list = {}

# dictionary to track rooms, or private channels
# Rooms = {"dn:" displayname, "room": room}
Rooms = {} 

# channel_messages = {
#    channel: chn,
#    messages: [{channel, displayname, timestamp, msg_txt}]

now = datetime.datetime.now()

startup_message = {
    "channel": "General",
    "user_from": "Flack Bot",
    "user_to": "",
    "timestamp": now.strftime("%a %b %d %I:%M:%S %Y"), 
    "msg_txt": "Welcome to Flack Messaging"}

channel_messages = {
    "General": {
        'messages': [startup_message]
}}
 
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/logout")
def logout():
    return render_template("index.html")

@app.route("/flackchat", methods=["POST", "GET"])
def flackchat():
    user = request.form.get("displayname")
    return render_template("channels.html", name=user)

@app.route("/register")
def register():
    return 0

@socketio.on("submit channel")
def new_channel(data):
    channel = data["channel"]
    channel_list.append(channel)
    emit("announce channel", {"channel": channel}, broadcast=True)
    return 1

@app.route("/query_channels", methods=["POST"])
def query_channels():
    return jsonify({"success": True, "channel_list": channel_list})

@app.route("/query_users", methods=["POST"])
def query_users():
    return jsonify({"success": True, "active_users": user_list})

@app.route("/query_messages", methods=["POST"])
def fetch_messages():
    channel = request.form.get("channel")
    dn = request.form.get("displayname")
    msg_status = request.form.get("msg_type")

    print (f"QM[0.0]: msg_status == PUBLIC is ", msg_status == 'PUBLIC')
    if (msg_status == "PUBLIC"):
        print (f"QM[0.1]: msg_status = ", msg_status, "channel = ", channel, "channel_messages = ", channel_messages)
        my_msgs = channel_messages.get(channel)
    else: 
        print (f"QM[0.2]: msg_status = ", msg_status, "channel_= ", channel, "user_dm_list = ", user_dm_list)
        my_msgs = user_dm_list.get(channel)

    print (f"QM[1]: channel =", channel, "dn = ", dn, " msg_status = ", msg_status, " my_msgs = ", my_msgs)
    if (my_msgs):
        msglist = my_msgs['messages']
        print (f"QM[2]: msglist = ", msglist)
        if ((msg_status == "PUBLIC") or (channel == dn)):
            return jsonify({"success": True, "channel_msgs": msglist})
        else:
            all_msgs = []
            for msg in msglist:
                # return only messages matching dn
                if ((msg["user_from"] == dn) or (msg['user_to'] == dn)):
                    print (f"QM[3]: appending msg ", msg)
                    all_msgs.append(msg)
            return jsonify({"success": True, "channel_msgs": all_msgs})
    else:
        return jsonify({"success": False, "error_msg": "No messages"})

@socketio.on("submit message")
def new_message(data):
    channel = data["channel"]
    user_from = data["user_from"]
    msg_txt = data["msg_txt"]
    timestamp = time.asctime( time.localtime( time.time() ) )


    msg = {"channel": channel, 
           "user_from": user_from, 
           "user_to": channel, 
           "timestamp": timestamp, 
           "msg_txt": msg_txt}
    if channel in channel_messages:
        # Public Channel with messages
        msgs = channel_messages[channel]
        if len(msgs['messages']) >= 100:
            del msgs['messages'][0]
        msgs['messages'].append(msg)
        emit("announce message", msg, broadcast=True)
        return jsonify ({"success": True})
    else:
        if (not (channel in user_dm_list)):
            # public channel, first message
            channel_messages[channel] = {"channel": channel, "messages": [msg]}
            emit("announce message", msg, broadcast=True)
            return jsonify ({"success": True})
        else: 
            # private message
            if (channel in user_dm_list):
                for user in [user_from, channel]:
                    msgs = user_dm_list[user]
                    if len(msgs['messages']) >= 100:
                        del msgs['messages'][0]
                    msgs['messages'].append(msg)
            else:
                user_dm_list[user] = {"channel": channel, "messages": [msg]}
            emit("announce message", msg, room=Rooms[user_from])
            emit("announce message", msg, room=Rooms[channel])
            return jsonify ({"success": True})

@socketio.on('join')
def on_join(data):
    username = data['displayname']
    if (username in user_list):
        return jsonify ({"success": False, "error_msg": "Display name in use"})
    else:
        if (username == ""):
            return jsonify ({"success": False, "error_msg": "No text entered"})

    room = data['room']
    user_dm_list[username] = ({"channel": username, "messages": []})
    user_list.append(username)
    join_room(room)
    Rooms[username] = room
    emit("new user", {"username": username}, broadcast= True)
    return jsonify ({"success": True})

@socketio.on('leave')
def on_leave(data):
    username = data['user_from']
    room = data['room']
    if (username in Rooms):
        leave_room(room)
        del Rooms["username"]
        emit("user left", {"username": username}, broadcast=True)
    return 1

if __name__ == "__main__":
    app.run()
