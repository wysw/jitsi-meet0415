import { IStore } from '../../app/types';
import { setAudioMuted, setVideoMuted } from '../media/actions';
import { MEDIA_TYPE, MediaType, VIDEO_MUTISM_AUTHORITY } from '../media/constants';

export * from './actions.any';

/**
 * Starts audio and/or video for the visitor.
 *
 * @param {Array<MediaType>} mediaTypes - The media types that need to be started.
 * @returns {Function}
 */
export function setupVisitorStartupMedia(mediaTypes: Array<MediaType>) {
    return (dispatch: IStore['dispatch']) => {
        if (!mediaTypes || !Array.isArray(mediaTypes)) {
            return;
        }

        mediaTypes.forEach(mediaType => {
            switch (mediaType) {
            case MEDIA_TYPE.AUDIO:
                dispatch(setAudioMuted(true, true)); // true 表示静音
                break;
            case MEDIA_TYPE.VIDEO:
                dispatch(setVideoMuted(true, VIDEO_MUTISM_AUTHORITY.USER, true)); // true 表示关闭摄像头
            }
        });
    };
}
