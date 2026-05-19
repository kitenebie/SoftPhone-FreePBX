import * as React from 'react';

declare module 'juv-ksip-softphone' {
  export interface SoftphoneProps {
    server?: string;
    extension?: string;
    password?: string;
    displayName?: string;
    wsProtocol?: string;
    wsPort?: string;
    enabledBubble?: boolean;
    showDialer?: boolean;
    showSettings?: boolean;
    showOpacity?: boolean;
    answerwithVideoCall?: boolean;
    ShowIncomingCallVideoBtn?: boolean;
    ShowIncomingCallAudio?: boolean;
    fullscreen?: boolean;
    autoRecord?: boolean;
    recordingDir?: string;
    uploadApiUrl?: string;
    settingConfigToggles?: any;
    settingConfigTogglesActiveState?: any;
    settingConfigCodecs?: any;
  }

  export const Softphone: React.FC<SoftphoneProps>;

  export interface KsipStatusProps {
    variant?: 'banner' | 'inline';
    className?: string;
    style?: React.CSSProperties;
  }

  export const ksip: {
    status: React.FC<KsipStatusProps>;
  };

  export const ksipcall: {
    audio: (target: string) => void;
    video: (target: string) => void;
  };
}
