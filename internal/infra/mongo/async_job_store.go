package mongo

import (
	"context"
	"errors"
	"time"

	coreasync "github.com/amirtaherkhani/wave-cast/internal/core/async"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type AsyncJobStore struct {
	collection *mongo.Collection
}

func (s *Store) AsyncJobStore() *AsyncJobStore {
	return &AsyncJobStore{collection: s.db.Collection("async_jobs")}
}

func (s *AsyncJobStore) EnsureIndexes(ctx context.Context) error {
	_, err := s.collection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "status", Value: 1}, {Key: "runAfter", Value: 1}}},
		{Keys: bson.D{{Key: "idempotencyKey", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "lockedUntil", Value: 1}}},
		{Keys: bson.D{{Key: "type", Value: 1}, {Key: "status", Value: 1}}},
	})
	return err
}

func (s *AsyncJobStore) Enqueue(ctx context.Context, job *coreasync.Job) error {
	_, err := s.collection.InsertOne(ctx, job)
	if mongo.IsDuplicateKeyError(err) {
		return nil
	}
	return err
}

func (s *AsyncJobStore) ClaimNext(ctx context.Context, workerID string, now time.Time, visibilityTimeout time.Duration) (*coreasync.Job, error) {
	lockedUntil := now.Add(visibilityTimeout)
	filter := bson.M{
		"runAfter": bson.M{"$lte": now},
		"$or": []bson.M{
			{"status": coreasync.JobStatusPending},
			{"status": coreasync.JobStatusRetrying},
			{"status": coreasync.JobStatusRunning, "$or": []bson.M{
				{"lockedUntil": bson.M{"$lt": now}},
				{"lockedUntil": bson.M{"$exists": false}},
			}},
		},
	}
	update := bson.M{
		"$set": bson.M{
			"status":      coreasync.JobStatusRunning,
			"lockedBy":    workerID,
			"lockedUntil": lockedUntil,
			"updatedAt":   now,
		},
		"$inc": bson.M{"attempts": 1},
	}
	opts := options.FindOneAndUpdate().
		SetSort(bson.D{{Key: "runAfter", Value: 1}, {Key: "createdAt", Value: 1}}).
		SetReturnDocument(options.After)

	var job coreasync.Job
	if err := s.collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(&job); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &job, nil
}

func (s *AsyncJobStore) Complete(ctx context.Context, jobID string, now time.Time) error {
	_, err := s.collection.UpdateByID(ctx, jobID, bson.M{"$set": bson.M{
		"status":    coreasync.JobStatusCompleted,
		"updatedAt": now,
	}, "$unset": bson.M{
		"lockedBy":    "",
		"lockedUntil": "",
	}})
	return err
}

func (s *AsyncJobStore) Retry(ctx context.Context, jobID string, nextRun time.Time, lastError string, now time.Time) error {
	_, err := s.collection.UpdateByID(ctx, jobID, bson.M{"$set": bson.M{
		"status":    coreasync.JobStatusRetrying,
		"runAfter":  nextRun,
		"lastError": lastError,
		"updatedAt": now,
	}, "$unset": bson.M{
		"lockedBy":    "",
		"lockedUntil": "",
	}})
	return err
}

func (s *AsyncJobStore) DeadLetter(ctx context.Context, jobID string, lastError string, now time.Time) error {
	_, err := s.collection.UpdateByID(ctx, jobID, bson.M{"$set": bson.M{
		"status":    coreasync.JobStatusDeadLetter,
		"lastError": lastError,
		"failedAt":  now,
		"updatedAt": now,
	}, "$unset": bson.M{
		"lockedBy":    "",
		"lockedUntil": "",
	}})
	return err
}
