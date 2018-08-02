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
    print(f"query_users: user_list = ", user_list)
    return jsonify({"success": True, "active_users": user_list})

@app.route("/query_messages", methods=["POST"])
def fetch_messages():
    channel = request.form.get("channel")
    dn = request.form.get("displayname")
    if (channel_messages.get(channel)):
        my_msgs = channel_messages[channel]['messages']
        return jsonify({"success": True, "channel_msgs": my_msgs})
    else: 
        print (f"query_messages: channel = ", channel, "get = ", user_dm_list[channel])
        if (user_dm_list.get(channel)):
            my_msgs = user_dm_list[channel]['messages']
            return jsonify({"success": True, "channel_msgs": my_msgs})
        else:
            return jsonify({"success": False, "error_msg": "No messages"})

@socketio.on("submit message")
def new_message(data):
    channel = data["channel"]
    timestamp = time.asctime( time.localtime( time.time() ) )


    msg = {"channel": channel, "user_from": data["user_from"], "user_to": "", "timestamp": timestamp, "msg_txt": data["msg_txt"]}
    if channel in channel_messages:
        msgs = channel_messages[data["channel"]]
        if len(msgs['messages']) >= 100:
            del msgs['messages'][0]
        msgs['messages'].append(msg)
    else:
        channel_messages[channel] = {"channel": channel, "messages": [msg]}
    emit("announce message", msg, broadcast=True)
    return 1

@socketio.on("submit dm")
def new_dm(data):
    user_to = data["dm_to"]
    user_from = data["dm_from"]
    timestamp = time.asctime( time.localtime( time.time() ) )

    if (user_to in user_dm_list):
        for user in [user_to, user_from]:
            msg = {"channel": user, "user_from": user_from, "user_to": user_to, "timestamp": timestamp, "msg_txt": data["dm_text"]}
#            print (f"new_dm: user = ", user, " user_to = ", user_to, " user_from = ", user_from)
            if user in user_dm_list:
                msgs = user_dm_list[user]
#                print(f"new_dm: user msgs is ", user_dm_list[user])
                if len(msgs['messages']) >= 100:
                    del msgs['messages'][0]
                    msgs['messages'].append(msg)
                else:
                    user_dm_list[user] = {"channel": user, "messages": [msg]}
                    print(f"new_dm: user msgs is ", user_dm_list[user])
                    rm = Rooms[user]
                    emit("add message", msg, room=rm)
                return jsonify ({"success": True})
    else:
        return jsonify ({"success": False, "error": "No such user"})

@socketio.on('join')
def on_join(data):
    username = data['displayname']
    if ((username == "") or (username in user_list)):
        return 1
    else:
        room = data['room']
        user_dm_list[username] = ({"channel": username, "messages": []})
        user_list.append(username)
        join_room(room)
        Rooms[username] = room
#        print(f" User ", username, ' has entered room ', room)
        emit("new user", {"username": username}, broadcast= True)
    return 1

@socketio.on('leave')
def on_leave(data):
    username = data['user_from']
    room = data['room']
    if (username in Rooms):
        leave_room(room)
        del Rooms["username"]
        print(f" User ", username, ' has left room ', room)
        emit("user left", {"username": username}, broadcast=True)
    return 1

if __name__ == "__main__":
    app.run()
