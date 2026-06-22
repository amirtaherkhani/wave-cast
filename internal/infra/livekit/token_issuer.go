package livekit

import (
	"context"
	"time"

	"github.com/amirtaherkhani/wave-cast/internal/app/voiceapp"
	"github.com/amirtaherkhani/wave-cast/internal/domain/voice"
	"github.com/livekit/protocol/auth"
)

type TokenIssuer struct {
	url       string
	apiKey    string
	apiSecret string
	ttl       time.Duration
}

func NewTokenIssuer(url, apiKey, apiSecret string, ttl time.Duration) *TokenIssuer {
	return &TokenIssuer{
		url:       url,
		apiKey:    apiKey,
		apiSecret: apiSecret,
		ttl:       ttl,
	}
}

func (i *TokenIssuer) IssueSpeakerToken(_ context.Context, input voiceapp.SpeakerTokenInput) (*voice.SpeakerMediaDescriptor, error) {
	token := auth.NewAccessToken(i.apiKey, i.apiSecret)
	grant := &auth.VideoGrant{
		RoomJoin: true,
		Room:     input.RoomName,
	}
	grant.SetCanPublish(true)
	grant.SetCanSubscribe(true)
	grant.SetCanPublishData(true)
	jwt, err := token.SetIdentity(input.Identity).
		SetName(input.Identity).
		SetValidFor(i.ttl).
		SetVideoGrant(grant).
		ToJWT()
	if err != nil {
		return nil, err
	}
	return &voice.SpeakerMediaDescriptor{
		Provider: "livekit",
		URL:      i.url,
		Token:    jwt,
		RoomName: input.RoomName,
		Identity: input.Identity,
	}, nil
}
