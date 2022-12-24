import Video from 'twilio-video';
import React from 'react';

const container = document.getElementById("video-container");

class VideoContainer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            roomName: '',
            showForm: '',
        }
    }

    handleChange = (event) => {
        const {name, value} = event.target;
        this.setState({[name]: value});
    };

    startRoom = async (event) => {
        // prevent a page reload when a user submits the form
        event.preventDefault();
        // hide the join form
        this.setState({showForm: 'hidden'});
        // retrieve the room name
        const roomName = this.state.roomName;
        console.log(roomName);

        // fetch an Access Token from the join-room route
        const response = await fetch("http://localhost:5000/join-room", {
            method: "POST",
            headers: {
                Accept: "application/json",
                'Content-Type' : 'application/json; charset=UTF-8'
            },
            body: JSON.stringify({roomName: roomName}),
        });
        const {token} = await response.json();

        // join the video room with the token
        const room = await this.joinVideoRoom(roomName, token);

        // render the local and remote participants' video and audio tracks
        this.handleConnectedParticipant(room.localParticipant);
        room.participants.forEach(this.handleConnectedParticipant);
        room.on("participantConnected", this.handleConnectedParticipant);

        // handle cleanup when a participant disconnects
        room.on("participantDisconnected", this.handleDisconnectedParticipant);
        window.addEventListener("pagehide", () => room.disconnect());
        window.addEventListener("beforeunload", () => room.disconnect());
    };

    handleConnectedParticipant = (participant) => {
        // create a div for this participant's tracks
        const participantDiv = document.createElement("div");
        participantDiv.setAttribute("id", participant.identity);
        container.appendChild(participantDiv);

        // iterate through the participant's published tracks and
        // call `handleTrackPublication` on them
        participant.tracks.forEach((trackPublication) => {
            this.handleTrackPublication(trackPublication, participant);
        });

        // listen for any new track publications
        participant.on("trackPublished", this.handleTrackPublication);
    };

    handleTrackPublication = (trackPublication, participant) => {
        function displayTrack(track) {
            // append this track to the participant's div and render it on the page
            const participantDiv = document.getElementById(participant.identity);
            // track.attach creates an HTMLVideoElement or HTMLAudioElement
            // (depending on the type of track) and adds the video or audio stream
            participantDiv.append(track.attach());
        }

        // check if the trackPublication contains a `track` attribute. If it does,
        // we are subscribed to this track. If not, we are not subscribed.
        if (trackPublication.track) {
            displayTrack(trackPublication.track);
        }

        // listen for any new subscriptions to this track publication
        trackPublication.on("subscribed", displayTrack);
    };

    handleDisconnectedParticipant = (participant) => {
        // stop listening for this participant
        participant.removeAllListeners();
        // remove this participant's div from the page
        const participantDiv = document.getElementById(participant.identity);
        participantDiv.remove();
    };

    joinVideoRoom = async (roomName, token) => {
        // join the video room with the Access Token and the given room name
        const room = await Video.connect(token, {
            room: roomName,
        });
        return room;
    };

    render() {
        return (
            <div>
                <form id="room-name-form" style={{visibility: this.state.showForm ? 'hidden' : 'visible'}}>
                    Enter a Room Name to join: <input type="text" name="roomName" onChange={this.handleChange}/>
                    <button type="click" onClick={async (event) => await this.startRoom(event)}>Join Room</button>
                </form>
            </div>

        );
    }
}

export default VideoContainer;