package main

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"github.com/codedust/go-tox"
	"io/ioutil"
	"net/http"
	"os"
	"runtime"
	"strings"
)

func rejectWithErrorJSON(w http.ResponseWriter, code string, message string) {
	type Err struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	}

	e := Err{Code: code, Message: message}
	jsonErr, _ := json.Marshal(e)
	http.Error(w, string(jsonErr), 422)
}

func rejectWithDefaultErrorJSON(w http.ResponseWriter) {
	type Err struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	}

	e := Err{Code: "unknown", Message: "An unknown error occoured."}
	jsonErr, _ := json.Marshal(e)
	http.Error(w, string(jsonErr), 422)
}

func getUserStatusAsString(status gotox.ToxUserStatus) string {
	switch status {
	case gotox.TOX_USERSTATUS_NONE:
		return "NONE"
	case gotox.TOX_USERSTATUS_AWAY:
		return "AWAY"
	case gotox.TOX_USERSTATUS_BUSY:
		return "BUSY"
	default:
		return "INVALID"
	}
}

func getUserStatusFromString(status string) gotox.ToxUserStatus {
	switch status {
	case "NONE":
		return gotox.TOX_USERSTATUS_NONE
	case "AWAY":
		return gotox.TOX_USERSTATUS_AWAY
	case "BUSY":
		return gotox.TOX_USERSTATUS_BUSY
	default:
		return gotox.TOX_USERSTATUS_NONE
	}
}

func getFriendListJSON() (string, error) {
	type Message struct {
		Message    string `json:"message"`
		IsIncoming bool   `json:"isIncoming"`
		IsAction   bool   `json:"isAction"`
		Time       int64  `json:"time"`
	}

	type friend struct {
		Number          uint32    `json:"number"`
		ID              string    `json:"id"`
		Chat            []Message `json:"chat"`
		LastMessageRead int64     `json:"last_msg_read"`
		Name            string    `json:"name"`
		Status          string    `json:"status"`
		StatusMsg       string    `json:"status_msg"`
		Online          bool      `json:"online"`
	}

	friend_ids, err := tox.SelfGetFriendlist()
	if err != nil {
		return "", err
	}

	friends := make([]friend, len(friend_ids))
	for i, friend_num := range friend_ids {
		// TODO: handle errors
		publicKey, _ := tox.FriendGetPublickey(friend_num)
		name, _ := tox.FriendGetName(friend_num)
		connected, _ := tox.FriendGetConnectionStatus(friend_num)
		userstatus, _ := tox.FriendGetStatus(friend_num)
		status_msg, _ := tox.FriendGetStatusMessage(friend_num)
		dbMessages := storage.GetMessages(hex.EncodeToString(publicKey), -1) // TOOD set a limit
		dbLastMessageRead, _ := storage.GetLastMessageRead(hex.EncodeToString(publicKey))

		var messages []Message

		for _, msg := range dbMessages {
			messages = append(messages, Message{Message: msg.Message, IsIncoming: msg.IsIncoming, IsAction: msg.IsAction, Time: msg.Time})
		}

		if messages == nil {
			messages = []Message{}
		}

		newfriend := friend{
			Number:          friend_num,
			ID:              strings.ToUpper(hex.EncodeToString(publicKey)),
			Chat:            messages,
			LastMessageRead: dbLastMessageRead,
			Name:            name,
			Status:          getUserStatusAsString(userstatus),
			StatusMsg:       string(status_msg),
			Online:          connected != gotox.TOX_CONNECTION_NONE,
		}

		friends[i] = newfriend
	}
	jsonFriends, _ := json.Marshal(friends)
	return string(jsonFriends), nil
}

func getUserprofilePath() string {
	if runtime.GOOS == "windows" {
		home := os.Getenv("HOMEDRIVE") + os.Getenv("HOMEPATH")
		if home == "" {
			home = os.Getenv("USERPROFILE")
		}
		return home
	}
	return os.Getenv("HOME")
}

func saveData(t *gotox.Tox, filepath string) error {
	if len(filepath) == 0 {
		return errors.New("Empty path")
	}

	data, err := t.GetSavedata()
	if err != nil {
		return err
	}

	err = ioutil.WriteFile(filepath, data, 0644)
	return err
}

func loadData(filepath string) ([]byte, error) {
	if len(filepath) == 0 {
		return nil, errors.New("Empty path")
	}

	data, err := ioutil.ReadFile(filepath)
	if err != nil {
		return nil, err
	}

	return data, err
}
