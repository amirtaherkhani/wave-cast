package s3

import (
	"context"
	"strings"
	"time"

	"github.com/amirtaherkhani/wave-cast/internal/config"
	"github.com/amirtaherkhani/wave-cast/internal/domain/voice"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
)

type Signer struct {
	client *awss3.PresignClient
}

func NewSigner(ctx context.Context, cfg config.S3Config) (*Signer, error) {
	loadOptions := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(cfg.Region),
	}
	if cfg.AccessKeyID != "" || cfg.SecretAccessKey != "" {
		loadOptions = append(loadOptions, awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, "")))
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, loadOptions...)
	if err != nil {
		return nil, err
	}
	clientOptions := []func(*awss3.Options){}
	if cfg.Endpoint != "" {
		endpoint := strings.TrimRight(cfg.Endpoint, "/")
		clientOptions = append(clientOptions, func(o *awss3.Options) {
			o.BaseEndpoint = aws.String(endpoint)
			o.UsePathStyle = true
		})
	}
	client := awss3.NewFromConfig(awsCfg, clientOptions...)
	return &Signer{client: awss3.NewPresignClient(client)}, nil
}

func (s *Signer) PlaybackURL(ctx context.Context, object voice.StorageObject, ttl time.Duration) (string, error) {
	if ttl <= 0 {
		ttl = 15 * time.Minute
	}
	out, err := s.client.PresignGetObject(ctx, &awss3.GetObjectInput{
		Bucket: aws.String(object.Bucket),
		Key:    aws.String(object.Key),
	}, func(opts *awss3.PresignOptions) {
		opts.Expires = ttl
	})
	if err != nil {
		return "", err
	}
	return out.URL, nil
}
