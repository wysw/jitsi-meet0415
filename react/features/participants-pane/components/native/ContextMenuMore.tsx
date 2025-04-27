import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity, View, ViewStyle } from 'react-native';
import { Divider, Text } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';

import { setChatPermissions } from '../../../chat/actions.any';
import { IReduxState } from '../../../app/types';
import {
    requestDisableAudioModeration,
    requestDisableVideoModeration,
    requestEnableAudioModeration,
    requestEnableVideoModeration
} from '../../../av-moderation/actions';
import {
    isEnabled as isAvModerationEnabled,
    isSupported as isAvModerationSupported
} from '../../../av-moderation/functions';
import { getCurrentConference } from '../../../base/conference/functions';
import { hideSheet, openDialog } from '../../../base/dialog/actions';
import BottomSheet from '../../../base/dialog/components/native/BottomSheet';
import Icon from '../../../base/icons/components/Icon';
import { IconCheck, IconRaiseHand, IconVideoOff } from '../../../base/icons/svg';
import { MEDIA_TYPE } from '../../../base/media/constants';
import { raiseHand } from '../../../base/participants/actions';
import { getParticipantCount, getRaiseHandsQueue, isEveryoneModerator, isLocalParticipantModerator }
    from '../../../base/participants/functions';
    
import { LOWER_HAND_MESSAGE } from '../../../base/tracks/constants';
import MuteEveryonesVideoDialog
    from '../../../video-menu/components/native/MuteEveryonesVideoDialog';

import { PERMISSIONS_MEETING_CHAT, PERMISSIONS_LOBBY_CHAT,PERMISSIONS_MEETING_SCREEN_SHARE } from '../../../base/participants/constants';
import { getChatPermissions } from '../../../chat/functions';

import styles from './styles';

export const ContextMenuMore = () => {
    const dispatch = useDispatch();
    const muteAllVideo = useCallback(() => {
        dispatch(openDialog(MuteEveryonesVideoDialog));
        dispatch(hideSheet());
    }, [ dispatch ]);
    const conference = useSelector(getCurrentConference);
    const raisedHandsQueue = useSelector(getRaiseHandsQueue);
    const moderator = useSelector(isLocalParticipantModerator);
    const lowerAllHands = useCallback(() => {
        dispatch(raiseHand(false));
        conference?.sendEndpointMessage('', { name: LOWER_HAND_MESSAGE });
        dispatch(hideSheet());
    }, [ dispatch ]);
    const { t } = useTranslation();

    const isModerationSupported = useSelector((state: IReduxState) => isAvModerationSupported()(state));
    const chatPermissions = useSelector(getChatPermissions);
  const handleChatPermissionChange = useCallback(
    (permission: string) => {
      dispatch(
        setChatPermissions({
          meetingChat: permission,
        })
      );
    },
    [dispatch]
  );
  const handleMeetingScreenSharePermissionChange = useCallback(
    (permission: string) => {
      dispatch(
        setChatPermissions({
            meetingScreenShare: permission,
        })
      );
    },
    [dispatch]
  );
  const handleLobbyChatPermissionChange = useCallback(
    (permission: string) => {
      dispatch(
        setChatPermissions({
          lobbyChat: permission,
        })
      );
    },
    [dispatch]
  );

    
    const participantCount = useSelector(getParticipantCount);
    const isModerator = useSelector(isLocalParticipantModerator);
    const isAudioModerationEnabled = useSelector(isAvModerationEnabled(MEDIA_TYPE.AUDIO));
    const isVideoModerationEnabled = useSelector(isAvModerationEnabled(MEDIA_TYPE.VIDEO));

    const disableAudioModeration = useCallback(() => dispatch(requestDisableAudioModeration()), [ dispatch ]);
    const disableVideoModeration = useCallback(() => dispatch(requestDisableVideoModeration()), [ dispatch ]);

    const enableAudioModeration = useCallback(() => dispatch(requestEnableAudioModeration()), [ dispatch ]);
    const enableVideoModeration = useCallback(() => dispatch(requestEnableVideoModeration()), [ dispatch ]);

    return (
        <BottomSheet
            addScrollViewPadding = { false }
            showSlidingView = { true }>
            <TouchableOpacity
                onPress = { muteAllVideo }
                style = { styles.contextMenuItem as ViewStyle }>
                <Icon
                    size = { 24 }
                    src = { IconVideoOff } />
                <Text style = { styles.contextMenuItemText }>{t('participantsPane.actions.stopEveryonesVideo')}</Text>
            </TouchableOpacity>
            { moderator && raisedHandsQueue.length !== 0 && <TouchableOpacity
                onPress = { lowerAllHands }
                style = { styles.contextMenuItem as ViewStyle }>
                <Icon
                    size = { 24 }
                    src = { IconRaiseHand } />
                <Text style = { styles.contextMenuItemText }>{t('participantsPane.actions.lowerAllHands')}</Text>
            </TouchableOpacity> }
            {isModerationSupported && <>
                {/* @ts-ignore */}
                <Divider style = { styles.divider } />
                <View style = { styles.contextMenuItem as ViewStyle }>
                    <Text style = { styles.contextMenuItemText }>{t('participantsPane.actions.allow')}</Text>
                </View>
                {isAudioModerationEnabled
                    ? <TouchableOpacity
                        onPress = { disableAudioModeration }
                        style = { styles.contextMenuItem as ViewStyle }>
                        <Text style = { styles.contextMenuItemTextNoIcon }>
                            {t('participantsPane.actions.audioModeration')}
                        </Text>
                    </TouchableOpacity>
                    : <TouchableOpacity
                        onPress = { enableAudioModeration }
                        style = { styles.contextMenuItem as ViewStyle }>
                        <Icon
                            size = { 24 }
                            src = { IconCheck } />
                        <Text style = { styles.contextMenuItemText }>
                            {t('participantsPane.actions.audioModeration')}
                        </Text>
                    </TouchableOpacity> }
                {isVideoModerationEnabled
                    ? <TouchableOpacity
                        onPress = { disableVideoModeration }
                        style = { styles.contextMenuItem as ViewStyle }>
                        <Text style = { styles.contextMenuItemTextNoIcon }>
                            {t('participantsPane.actions.videoModeration')}
                        </Text>
                    </TouchableOpacity>
                    : <TouchableOpacity
                        onPress = { enableVideoModeration }
                        style = { styles.contextMenuItem as ViewStyle }>
                        <Icon
                            size = { 24 }
                            src = { IconCheck } />
                        <Text style = { styles.contextMenuItemText }>
                            {t('participantsPane.actions.videoModeration')}
                        </Text>
                    </TouchableOpacity>}
                    </>} 
                {(isModerator || participantCount === 1) && <>
                    <TouchableOpacity
                        onPress={() =>
                            handleMeetingScreenSharePermissionChange(
                            chatPermissions.meetingScreenShare ===
                            PERMISSIONS_MEETING_SCREEN_SHARE.ALLOW
                            ? PERMISSIONS_MEETING_SCREEN_SHARE.PROHIBITED
                            : PERMISSIONS_MEETING_SCREEN_SHARE.ALLOW
                        )
                        }
                        style={styles.contextMenuItem as ViewStyle}
                    >
                        {chatPermissions.meetingScreenShare === PERMISSIONS_MEETING_SCREEN_SHARE.ALLOW && (
                        <Icon size={24} src={IconCheck} />
                        )}

                        <Text style={styles.contextMenuItemText}>
                        {t('participantsPane.actions.allowScreenShare')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() =>
                        handleLobbyChatPermissionChange(
                            chatPermissions.lobbyChat ===
                            PERMISSIONS_LOBBY_CHAT.PRIVATETO_HOST
                            ? PERMISSIONS_LOBBY_CHAT.MUTED
                            : PERMISSIONS_LOBBY_CHAT.PRIVATETO_HOST
                        )
                        }
                        style={styles.contextMenuItem as ViewStyle}
                    >
                        {chatPermissions.lobbyChat ===
                        PERMISSIONS_LOBBY_CHAT.PRIVATETO_HOST && (
                        <Icon size={24} src={IconCheck} />
                        )}

                        <Text style={styles.contextMenuItemText}>
                        {t('participantsPane.actions.allowPrivateChatWithModerator')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() =>
                        handleChatPermissionChange(PERMISSIONS_MEETING_CHAT.FREE)
                        }
                        style={styles.contextMenuItem as ViewStyle}
                    >
                        {chatPermissions.meetingChat === PERMISSIONS_MEETING_CHAT.FREE && (
                        <Icon size={24} src={IconCheck} />
                        )}

                        <Text style={styles.contextMenuItemText}>
                        {t('participantsPane.actions.allowFreeSpeech')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() =>
                        handleChatPermissionChange(PERMISSIONS_MEETING_CHAT.PUBLIC_ONLY)
                        }
                        style={styles.contextMenuItem as ViewStyle}
                    >
                        {chatPermissions.meetingChat ===
                        PERMISSIONS_MEETING_CHAT.PUBLIC_ONLY && (
                        <Icon size={24} src={IconCheck} />
                        )}

                        <Text style={styles.contextMenuItemText}>
                        {t('participantsPane.actions.onlyPublicComments')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() =>
                        handleChatPermissionChange(
                            PERMISSIONS_MEETING_CHAT.PRIVATETO_HOST
                        )
                        }
                        style={styles.contextMenuItem as ViewStyle}
                    >
                        {chatPermissions.meetingChat ===
                        PERMISSIONS_MEETING_CHAT.PRIVATETO_HOST && (
                        <Icon size={24} src={IconCheck} />
                        )}

                        <Text style={styles.contextMenuItemText}>
                        {t('participantsPane.actions.chatWithHostOnly')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleChatPermissionChange('muted')}
                        style={styles.contextMenuItem as ViewStyle}
                    >
                        {chatPermissions.meetingChat === PERMISSIONS_MEETING_CHAT.MUTED && (
                        <Icon size={24} src={IconCheck} />
                        )}

                        <Text style={styles.contextMenuItemText}>
                        {t('participantsPane.actions.allMembersMuted')}
                        </Text>
                    </TouchableOpacity>                                            
            </>}
        </BottomSheet>
    );
};
