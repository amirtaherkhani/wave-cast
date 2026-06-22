package ids

import "github.com/oklog/ulid/v2"

const (
	PrefixRoom            = "room"
	PrefixUser            = "usr"
	PrefixListenerSession = "lsn"
	PrefixParticipant     = "part_sess"
	PrefixSpeakerRequest  = "spreq"
	PrefixSpeakerSegment  = "seg"
	PrefixListenerStream  = "lst_stream"
	PrefixRecording       = "rec"
	PrefixReport          = "rep"
	PrefixEvent           = "evt"
	PrefixJob             = "job"
)

func New(prefix string) string {
	return prefix + "_" + ulid.Make().String()
}
