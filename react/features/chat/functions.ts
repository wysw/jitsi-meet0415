// @ts-expect-error
import aliases from 'react-emoji-render/data/aliases';
// eslint-disable-next-line lines-around-comment
// @ts-expect-error
import emojiAsciiAliases from 'react-emoji-render/data/asciiAliases';

import { IReduxState } from '../app/types';
import { getLocalizedDateFormatter } from '../base/i18n/dateUtil';
import i18next from '../base/i18n/i18next';
import { MEET_FEATURES } from '../base/jwt/constants';
import { isJwtFeatureEnabled } from '../base/jwt/functions';
import {
  getParticipantById,
  isLocalParticipantModerator,
} from '../base/participants/functions';
import { escapeRegexp } from '../base/util/helpers';

import { MESSAGE_TYPE_ERROR, MESSAGE_TYPE_LOCAL, TIMESTAMP_FORMAT } from './constants';
import {
  PERMISSIONS_MEETING_CHAT,
  PERMISSIONS_LOBBY_CHAT,
} from '../base/participants/constants';
import { IMessage } from './types';
import { toState } from '../base/redux/functions';
import { IStateful } from '../base/app/types';

/**
 * An ASCII emoticon regexp array to find and replace old-style ASCII
 * emoticons (such as :O) with the new Unicode representation, so that
 * devices and browsers that support them can render these natively
 * without a 3rd party component.
 *
 * NOTE: this is currently only used on mobile, but it can be used
 * on web too once we drop support for browsers that don't support
 * unicode emoji rendering.
 */
const ASCII_EMOTICON_REGEXP_ARRAY: Array<[RegExp, string]> = [];

/**
 * An emoji regexp array to find and replace alias emoticons
 * (such as :smiley:) with the new Unicode representation, so that
 * devices and browsers that support them can render these natively
 * without a 3rd party component.
 *
 * NOTE: this is currently only used on mobile, but it can be used
 * on web too once we drop support for browsers that don't support
 * unicode emoji rendering.
 */
const SLACK_EMOJI_REGEXP_ARRAY: Array<[RegExp, string]> = [];

(function() {
    for (const [ key, value ] of Object.entries(aliases)) {

    // Add ASCII emoticons
    const asciiEmoticons = emojiAsciiAliases[key];

    if (asciiEmoticons) {
            const asciiEscapedValues = asciiEmoticons.map((v: string) => escapeRegexp(v));

      const asciiRegexp = `(${asciiEscapedValues.join('|')})`;

      // Escape urls
            const formattedAsciiRegexp = key === 'confused'
                ? `(?=(${asciiRegexp}))(:(?!//).)`
                : asciiRegexp;

            ASCII_EMOTICON_REGEXP_ARRAY.push([ new RegExp(formattedAsciiRegexp, 'g'), value as string ]);
    }

    // Add slack-type emojis
    const emojiRegexp = `\\B(${escapeRegexp(`:${key}:`)})\\B`;

        SLACK_EMOJI_REGEXP_ARRAY.push([ new RegExp(emojiRegexp, 'g'), value as string ]);
  }
})();

/**
 * Replaces ASCII and other non-unicode emoticons with unicode emojis to let the emojis be rendered
 * by the platform native renderer.
 *
 * @param {string} message - The message to parse and replace.
 * @returns {string}
 */
export function replaceNonUnicodeEmojis(message: string): string {
  let replacedMessage = message;

    for (const [ regexp, replaceValue ] of SLACK_EMOJI_REGEXP_ARRAY) {
    replacedMessage = replacedMessage.replace(regexp, replaceValue);
  }

    for (const [ regexp, replaceValue ] of ASCII_EMOTICON_REGEXP_ARRAY) {
    replacedMessage = replacedMessage.replace(regexp, replaceValue);
  }

  return replacedMessage;
}

/**
 * Selector for calculating the number of unread chat messages.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {number} The number of unread messages.
 */
export function getUnreadCount(state: IReduxState) {
  const { lastReadMessage, messages } = state['features/chat'];
  const messagesCount = messages.length;

  if (!messagesCount) {
    return 0;
  }

  let reactionMessages = 0;
    let lastReadIndex: number;

  if (navigator.product === 'ReactNative') {
    // React native stores the messages in a reversed order.
    lastReadIndex = messages.indexOf(<IMessage>lastReadMessage);

    for (let i = 0; i < lastReadIndex; i++) {
      if (messages[i].isReaction) {
        reactionMessages++;
      }
    }

    return lastReadIndex - reactionMessages;
  }

  lastReadIndex = messages.lastIndexOf(<IMessage>lastReadMessage);

  for (let i = lastReadIndex + 1; i < messagesCount; i++) {
    if (messages[i].isReaction) {
      reactionMessages++;
    }
  }

  return messagesCount - (lastReadIndex + 1) - reactionMessages;
}

/**
 * Get whether the chat smileys are disabled or not.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {boolean} The disabled flag.
 */
export function areSmileysDisabled(state: IReduxState) {
    const disableChatSmileys = state['features/base/config']?.disableChatSmileys === true;

  return disableChatSmileys;
}

/**
 * Returns the timestamp to display for the message.
 *
 * @param {IMessage} message - The message from which to get the timestamp.
 * @returns {string}
 */
export function getFormattedTimestamp(message: IMessage) {
    return getLocalizedDateFormatter(new Date(message.timestamp))
        .format(TIMESTAMP_FORMAT);
}

/**
 * Generates the message text to be rendered in the component.
 *
 * @param {IMessage} message - The message from which to get the text.
 * @returns {string}
 */
export function getMessageText(message: IMessage) {
  return message.messageType === MESSAGE_TYPE_ERROR
    ? i18next.t('chat.error', {
            error: message.message
      })
    : message.message;
}


/**
 * Returns whether a message can be replied to.
 *
 * @param {IReduxState} state - The redux state.
 * @param {IMessage} message - The message to be checked.
 * @returns {boolean}
 */
export function getCanReplyToMessage(state: IReduxState, message: IMessage) {
    const { knocking } = state['features/lobby'];
    const participant = getParticipantById(state, message.participantId);

    return Boolean(participant)
        && (message.privateMessage || (message.lobbyChat && !knocking))
        && message.messageType !== MESSAGE_TYPE_LOCAL;
}

/**
 * 检查当前用户是否具有发送聊天消息的权限。
 *
 * 聊天权限分类：
 * 1. **会议中聊天权限 (`meetingChat`)**
 *    - `FREE`: 允许自由聊天
 *    - `PUBLIC_ONLY`: 仅允许公开聊天
 *    - `PRIVATETO_HOST`: 仅允许私聊主持人
 *    - `MUTED`: 禁言（房主和管理员除外）
 *
 * 2. **等候室聊天权限 (`lobbyChat`)**
 *    - `PRIVATETO_HOST`: 允许等候室成员私聊主持人
 *    - `MUTED`: 禁止等候室聊天
 *
 * **权限逻辑：**
 * - 主持人 (`moderator`) 拥有所有聊天权限。
 * - 会议聊天权限 (`meetingChat`) 控制参与者在会议中的聊天行为。
 * - 等候室聊天权限 (`lobbyChat`) 仅影响仍在等候室的用户。
 *
 * @param {IReduxState} state - Redux 全局状态
 * @returns {boolean} 是否允许当前用户发送聊天消息
 */
export function hasChatPermissions(state: IReduxState) {
  // 判断当前用户是否是主持人（主持人不受聊天权限限制）
  if (isLocalParticipantModerator(state)) {
    return true;
  }
  // 获取全局状态中的聊天权限和相关数据
  const { knocking: lobbyChat } = state['features/lobby']; // 是否在等候室
  const { chatPermissions, messages, privateMessageRecipient } =
    state['features/chat'];

  // 判断当前私聊对象是否是主持人
  const isRecipientModerator = privateMessageRecipient?.role === 'moderator';

  // 获取最近一条消息（适配不同平台）
  const lastMessage =
    navigator.product === 'ReactNative'
      ? messages[0]
      : messages[messages.length - 1];

  // 会议中聊天权限检查
  if (!lobbyChat) {
    switch (chatPermissions.meetingChat) {
      case PERMISSIONS_MEETING_CHAT.MUTED:
        return false; // 禁言，禁止所有聊天
      case PERMISSIONS_MEETING_CHAT.PRIVATETO_HOST:
        if (!lastMessage?.privateMessage || !isRecipientModerator) {
          return false; // 仅允许私聊主持人，其他情况禁言
        }
        break;
      case PERMISSIONS_MEETING_CHAT.PUBLIC_ONLY:
        if (lastMessage?.privateMessage) {
          return false; // 禁止私聊，仅允许公开聊天
        }
        break;
      default:
        break; // `FREE` 模式，无需额外限制
    }
  }

  // 等候室聊天权限检查
  if (lobbyChat) {
    switch (chatPermissions.lobbyChat) {
      case PERMISSIONS_LOBBY_CHAT.MUTED:
        return false; // 禁止等候室聊天
      case PERMISSIONS_LOBBY_CHAT.PRIVATETO_HOST:
        if (!lastMessage?.privateMessage || !isRecipientModerator) {
          return false; // 仅允许等候室成员私聊主持人
        }
        break;
      default:
        break;
    }
  }

  return true; // 通过所有权限检查，允许发送消息
}

/**
 * Returns the message that is displayed as a notice for private messages.
 *
 * @param {IMessage} message - The message to be checked.
 * @returns {string}
 */
export function getPrivateNoticeMessage(message: IMessage) {
  return i18next.t('chat.privateNotice', {
        recipient: message.messageType === MESSAGE_TYPE_LOCAL ? message.recipient : i18next.t('chat.you')
  });
}

/**
 * 获取当前会议和等候室的聊天权限设置。
 *
 * @param {IStateful} stateful - 代表 Redux 状态的参数，可以是 Redux store 或者一个函数。
 * @returns {Object} chatPermissions - 当前会议和等候室的聊天权限配置。
 *
 * `chatPermissions` 包含两个权限配置：
 * - **meetingChat**: 控制会议中的聊天权限，可能的值：
 *   - `PERMISSIONS_MEETING_CHAT.FREE`: 允许所有人自由聊天。
 *   - `PERMISSIONS_MEETING_CHAT.PUBLIC_ONLY`: 仅允许公开聊天。
 *   - `PERMISSIONS_MEETING_CHAT.PRIVATETO_HOST`: 仅允许私聊主持人。
 *   - `PERMISSIONS_MEETING_CHAT.MUTED`: 禁止所有成员聊天。
 *
 * - **lobbyChat**: 控制等候室中的聊天权限，可能的值：
 *   - `PERMISSIONS_LOBBY_CHAT.PRIVATETO_HOST`: 仅允许私聊主持人。
 *   - `PERMISSIONS_LOBBY_CHAT.MUTED`: 禁止所有成员聊天。
 *
 * 使用示例：
 * ```ts
 * const chatPermissions = getChatPermissions(state);
 * console.log(chatPermissions.meetingChat); // 输出会议中的聊天权限
 * console.log(chatPermissions.lobbyChat);  // 输出等候室中的聊天权限
 * ```
 */
export function getChatPermissions(stateful: IStateful) {
  const state = toState(stateful);
  const { chatPermissions } = state['features/chat'];
  return chatPermissions;
}

/**
 * Check if participant is not allowed to send group messages.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {boolean} - Returns true if the participant is not allowed to send group messages.
 */
export function isSendGroupChatDisabled(state: IReduxState) {
  const { groupChatRequiresPermission } = state['features/dynamic-branding'];

  if (!groupChatRequiresPermission) {
      return false;
  }

  return !isJwtFeatureEnabled(state, MEET_FEATURES.SEND_GROUPCHAT, false);
}
