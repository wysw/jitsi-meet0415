import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import { setChatPermissions } from '../../../chat/actions.any';

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
import { openDialog } from '../../../base/dialog/actions';
import {
  IconCheck,
  IconDotsHorizontal,
    IconVideoOff
} from '../../../base/icons/svg';
import { MEDIA_TYPE } from '../../../base/media/constants';
import {
  getParticipantCount,
  getRaiseHandsQueue,
    isEveryoneModerator
} from '../../../base/participants/functions';
import { withPixelLineHeight } from '../../../base/styles/functions.web';
import ContextMenu from '../../../base/ui/components/web/ContextMenu';
import ContextMenuItemGroup from '../../../base/ui/components/web/ContextMenuItemGroup';
import { isInBreakoutRoom } from '../../../breakout-rooms/functions';
import { openSettingsDialog } from '../../../settings/actions.web';
import { SETTINGS_TABS } from '../../../settings/constants';
import { shouldShowModeratorSettings } from '../../../settings/functions.web';
import LowerHandButton from '../../../video-menu/components/web/LowerHandButton';
import MuteEveryonesVideoDialog from '../../../video-menu/components/web/MuteEveryonesVideoDialog';
import {
  PERMISSIONS_MEETING_CHAT,
  PERMISSIONS_LOBBY_CHAT,
  PERMISSIONS_MEETING_SCREEN_SHARE
} from '../../../base/participants/constants';
import { isLocalParticipantModerator } from '../../../base/participants/functions';
import { getChatPermissions } from '../../../chat/functions';

const useStyles = makeStyles()(theme => {
  return {
    contextMenu: {
      bottom: 'auto',
      margin: '0',
      right: 0,
      top: '-8px',
      transform: 'translateY(-100%)',
            width: '283px'
    },

    text: {
      ...withPixelLineHeight(theme.typography.bodyShortRegular),
      color: theme.palette.text02,
      padding: '10px 16px',
      height: '40px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
            boxSizing: 'border-box'
    },

    indentedLabel: {
      '& > span': {
                marginLeft: '36px'
            }
        }
  };
});

interface IProps {

  /**
   * Whether the menu is open.
   */
  isOpen: boolean;

  /**
   * Drawer close callback.
   */
  onDrawerClose: (e?: React.MouseEvent) => void;

  /**
   * Callback for the mouse leaving this item.
   */
  onMouseLeave?: (e?: React.MouseEvent) => void;
}

export const FooterContextMenu = ({
  isOpen,
  onDrawerClose,
  onMouseLeave,
}: IProps) => {
  const dispatch = useDispatch();
  const isModerationSupported = useSelector((state: IReduxState) => isAvModerationSupported()(state));
  // 当前是主持人
  const chatPermissions = useSelector(getChatPermissions);
  const raisedHandsQueue = useSelector(getRaiseHandsQueue);
  const isModeratorSettingsTabEnabled = useSelector(shouldShowModeratorSettings);
  const isAudioModerationEnabled = useSelector(isAvModerationEnabled(MEDIA_TYPE.AUDIO));
  const isVideoModerationEnabled = useSelector(isAvModerationEnabled(MEDIA_TYPE.VIDEO));
  const isBreakoutRoom = useSelector(isInBreakoutRoom);

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

  const { t } = useTranslation();

  const disableAudioModeration = useCallback(() => dispatch(requestDisableAudioModeration()), [ dispatch ]);

  const disableVideoModeration = useCallback(() => dispatch(requestDisableVideoModeration()), [ dispatch ]);

  const enableAudioModeration = useCallback(() => dispatch(requestEnableAudioModeration()), [ dispatch ]);

  const enableVideoModeration = useCallback(() => dispatch(requestEnableVideoModeration()), [ dispatch ]);

  const { classes } = useStyles();

  const muteAllVideo = useCallback(
    () => dispatch(openDialog(MuteEveryonesVideoDialog)),
    [dispatch]
  );

  const openModeratorSettings = () =>
    dispatch(openSettingsDialog(SETTINGS_TABS.MODERATOR));
  const perChatActions = [
      {
      accessibilityLabel: t('participantsPane.actions.allowScreenShare'),
      className: classes.indentedLabel,
      id: 'participantsPane.actions.allowScreenShare',
      icon:
      chatPermissions.meetingScreenShare === PERMISSIONS_MEETING_SCREEN_SHARE.ALLOW &&
        IconCheck,
      onClick: () =>
        handleMeetingScreenSharePermissionChange(
          chatPermissions.meetingScreenShare ===
          PERMISSIONS_MEETING_SCREEN_SHARE.ALLOW
          ? PERMISSIONS_MEETING_SCREEN_SHARE.PROHIBITED
          : PERMISSIONS_MEETING_SCREEN_SHARE.ALLOW
      ),
      text: t('participantsPane.actions.allowScreenShare'),
    },
    {
      accessibilityLabel: t(
        'participantsPane.actions.allowPrivateChatWithModerator'
      ),
      className: classes.indentedLabel,
      id: 'participantsPane.actions.allowPrivateChatWithModerator',
      icon:
        chatPermissions.lobbyChat === PERMISSIONS_LOBBY_CHAT.PRIVATETO_HOST &&
        IconCheck,
      onClick: () =>
        handleLobbyChatPermissionChange(
          chatPermissions.lobbyChat === PERMISSIONS_LOBBY_CHAT.PRIVATETO_HOST
            ? PERMISSIONS_LOBBY_CHAT.MUTED
            : PERMISSIONS_LOBBY_CHAT.PRIVATETO_HOST
        ),
      text: t('participantsPane.actions.allowPrivateChatWithModerator'),
    },
    {
      accessibilityLabel: t('participantsPane.actions.allowFreeSpeech'),
      className: classes.indentedLabel,
      id: 'participantsPane.actions.allowFreeSpeech',
      icon:
        chatPermissions.meetingChat === PERMISSIONS_MEETING_CHAT.FREE &&
        IconCheck,
      onClick: () => handleChatPermissionChange(PERMISSIONS_MEETING_CHAT.FREE),
      text: t('participantsPane.actions.allowFreeSpeech'),
    },
    {
      accessibilityLabel: t('participantsPane.actions.onlyPublicComments'),
      className: classes.indentedLabel,
      id: 'participantsPane.actions.onlyPublicComments',
      onClick: () =>
        handleChatPermissionChange(PERMISSIONS_MEETING_CHAT.PUBLIC_ONLY),
      icon:
        chatPermissions.meetingChat === PERMISSIONS_MEETING_CHAT.PUBLIC_ONLY &&
        IconCheck,
      text: t('participantsPane.actions.onlyPublicComments'),
    },
    {
      accessibilityLabel: t('participantsPane.actions.chatWithHostOnly'),
      className: classes.indentedLabel,
      id: 'participantsPane.actions.chatWithHostOnly',
      onClick: () =>
        handleChatPermissionChange(PERMISSIONS_MEETING_CHAT.PRIVATETO_HOST),
      icon:
        chatPermissions.meetingChat ===
          PERMISSIONS_MEETING_CHAT.PRIVATETO_HOST && IconCheck,
      text: t('participantsPane.actions.chatWithHostOnly'),
    },
    {
      accessibilityLabel: t('participantsPane.actions.allMembersMuted'),
      className: classes.indentedLabel,
      id: 'participantsPane.actions.allMembersMuted',
      icon:
        chatPermissions.meetingChat === PERMISSIONS_MEETING_CHAT.MUTED &&
        IconCheck,
      onClick: () => handleChatPermissionChange('muted'),
      text: t('participantsPane.actions.allMembersMuted'),
    },
  ];
  const actions: any = [...perChatActions];
  if (isModerationSupported) {
    actions.unshift(
      ...[
        {
          accessibilityLabel: t('participantsPane.actions.audioModeration'),
          className: isAudioModerationEnabled ? classes.indentedLabel : '',
          id: isAudioModerationEnabled
            ? 'participants-pane-context-menu-stop-audio-moderation'
            : 'participants-pane-context-menu-start-audio-moderation',
          icon: !isAudioModerationEnabled && IconCheck,
          onClick: isAudioModerationEnabled
            ? disableAudioModeration
            : enableAudioModeration,
          text: t('participantsPane.actions.audioModeration'),
        },
        {
          accessibilityLabel: t('participantsPane.actions.videoModeration'),
          className: isVideoModerationEnabled ? classes.indentedLabel : '',
          id: isVideoModerationEnabled
            ? 'participants-pane-context-menu-stop-video-moderation'
            : 'participants-pane-context-menu-start-video-moderation',
          icon: !isVideoModerationEnabled && IconCheck,
          onClick: isVideoModerationEnabled
            ? disableVideoModeration
            : enableVideoModeration,
          text: t('participantsPane.actions.videoModeration'),
        },
      ]
    );
  }

  return (
    <ContextMenu
      activateFocusTrap={true}
      className={classes.contextMenu}
      hidden={!isOpen}
      isDrawerOpen={isOpen}
      onDrawerClose={onDrawerClose}
      onMouseLeave={onMouseLeave}
    >
      <ContextMenuItemGroup
        actions={[
          {
            accessibilityLabel: t(
              'participantsPane.actions.stopEveryonesVideo'
            ),
            id: 'participants-pane-context-menu-stop-video',
            icon: IconVideoOff,
            onClick: muteAllVideo,
            text: t('participantsPane.actions.stopEveryonesVideo'),
          },
        ]}
      />
      {raisedHandsQueue.length !== 0 && <LowerHandButton />}
      {!isBreakoutRoom && isModerationSupported && (
        <ContextMenuItemGroup actions={actions}>
          <div className={classes.text}>
            <span>{t('participantsPane.actions.allow')}</span>
          </div>
        </ContextMenuItemGroup>
      )}
      {isModeratorSettingsTabEnabled && (
        <ContextMenuItemGroup
          actions={[ {
              accessibilityLabel: t('participantsPane.actions.moreModerationControls'),
              id: 'participants-pane-open-moderation-control-settings',
              icon: IconDotsHorizontal,
              onClick: openModeratorSettings,
              text: t('participantsPane.actions.moreModerationControls')
            } ]} />
      )}
    </ContextMenu>
  );
};
