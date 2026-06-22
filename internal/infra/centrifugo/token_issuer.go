package centrifugo

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenIssuer struct {
	secret          []byte
	connectionTTL   time.Duration
	subscriptionTTL time.Duration
}

func NewTokenIssuer(secret string, connectionTTL, subscriptionTTL time.Duration) *TokenIssuer {
	return &TokenIssuer{
		secret:          []byte(secret),
		connectionTTL:   connectionTTL,
		subscriptionTTL: subscriptionTTL,
	}
}

func (i *TokenIssuer) ConnectionToken(userID string) (string, error) {
	return i.sign(jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(i.connectionTTL).Unix(),
	})
}

func (i *TokenIssuer) SubscriptionToken(userID, channel string) (string, error) {
	return i.sign(jwt.MapClaims{
		"sub":     userID,
		"channel": channel,
		"exp":     time.Now().Add(i.subscriptionTTL).Unix(),
	})
}

func (i *TokenIssuer) sign(claims jwt.MapClaims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(i.secret)
}
