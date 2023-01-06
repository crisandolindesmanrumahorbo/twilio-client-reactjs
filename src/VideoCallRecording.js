import Video from 'twilio-video';
import React from 'react';
import RecordRTC, {invokeSaveAsDialog} from 'recordrtc';

const container = document.getElementById("video-container");

class VideoCallRecording extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            roomName: '',
            showForm: '',
            blob: null,
            recorder: null,
            screen: null,
            audio: null
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

        // fetch an Access Token from the join-room route https://161b-2001-448a-50a0-1da-b185-9f97-fff2-54d7.ap.ngrok.io
        const response = await fetch("https://8ec8-2001-448a-50a0-1da-b185-9f97-fff2-54d7.ap.ngrok.io/join-room", {
            method: "POST",
            headers: {
                Accept: "application/json",
                'Content-Type': 'application/json; charset=UTF-8'
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

    startRecord = async (event) => {
        const navigatorDisplay = await navigator.getDisplayMedia;
        const mediaDevices = await navigator.mediaDevices.getDisplayMedia;
        if (!navigatorDisplay && !mediaDevices) {
            const error = 'Your browser does NOT supports getDisplayMedia API.';
            throw new Error(error);
        }
        // prevent a page reload when a user submits the form
        event.preventDefault();
        console.log('start');

        await this.setupStream();
        const sleep = m => new Promise(r => setTimeout(r, m));
        await sleep(2000);

        const {screen, audio} = this.state;
        console.log('mix', screen + audio)

        if (screen && audio) {
            const audioTag = document.getElementsByTagName('audio');
            console.log('audio tag', audioTag);

            let audioStream;
            const fps = 0;
            const audioRemote = audioTag[1];
            if (audioRemote.captureStream) {
                audioStream = audioRemote.captureStream(fps);
            } else if (audioRemote.mozCaptureStream) {
                audioStream = audioRemote.mozCaptureStream(fps);
            } else {
                console.error('Stream capture is not supported');
                audioStream = null;
                return;
            }

            const recorder = RecordRTC([screen, audio, audioStream], {
                type: 'video',
                mimeType: 'video/webm',
                video: {width: 854, height: 480}
            });
            console.log('screen', screen);
            // console.log('audio', this.state.audio.getTracks);
            // console.log('audio Stream', audioStream.getTracks);
            this.setState({recorder});
            recorder.startRecording();
        }
    }

    stopRecord = () => {
        console.log('stop')
        this.state.recorder.stopRecording(() => {
            this.setState({blob: this.state.recorder.getBlob()})
        });
    }

    setupStream = async () => {
        const screen = await navigator.mediaDevices.getDisplayMedia({
            video: true,

        }, () => console.log('nav', screen.getTracks()));
        const audio = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });
        this.setState({screen}, () => {
            console.log('screen', screen.getTracks() == null ? 'null' : 'not null')
        });
        this.setState({audio}, () => {
            console.log('audio', audio.getTracks() == null ? 'null' : 'not null')
        });
    }

    save = () => {
        console.log('save');
        invokeSaveAsDialog(this.state.blob, 'audio');
    }

    render() {
        return (
            <div>
                <form id="room-name-form" style={{visibility: this.state.showForm ? 'hidden' : 'visible'}}>
                    Enter a Room Name to join: <input type="text" name="roomName" onChange={this.handleChange}/>
                    <button type="click" onClick={async (event) => await this.startRoom(event)}>Join Room</button>
                </form>
                <button type="click" onClick={async (event) => await this.startRecord(event)}>Start Record</button>
                <button type="click" onClick={() => this.stopRecord()}>Stop Record</button>
                <button type="click" onClick={() => this.save()}>Save</button>
            </div>

        );
    }
}

export default VideoCallRecording;