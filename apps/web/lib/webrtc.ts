export function createPeerConnection(
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onTrack: (stream: MediaStream) => void
) {
  const iceServers: RTCIceServer[] = [];

  const stun = process.env.NEXT_PUBLIC_STUN_URL;
  if (stun) iceServers.push({ urls: stun });

  const turn = process.env.NEXT_PUBLIC_TURN_URL;
  const username = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turn && username && credential) {
    iceServers.push({
      urls: turn,
      username,
      credential
    });
  }

  const pc = new RTCPeerConnection({ iceServers });

  pc.onicecandidate = (event) => {
    if (event.candidate) onIceCandidate(event.candidate);
  };

  pc.ontrack = (event) => {
    if (event.streams[0]) onTrack(event.streams[0]);
  };

  return pc;
}
