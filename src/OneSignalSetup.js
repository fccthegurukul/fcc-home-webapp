import OneSignal from 'react-onesignal';

const appId = process.env.REACT_APP_ONESIGNAL_APP_ID;
await OneSignal.init({ appId });

export const initializeOneSignal = async () => {
    await OneSignal.init({
        appId: "d0b352ba-71ba-4093-bd85-4e3002360631",
        safari_web_id: "web.onesignal.auto.1a94b592-c98a-427e-9490-520bfcd23754",
        notifyButton: {
            enable: true, // Notification allow button enable karein
        },
    });

    // Permission check karein
    const isPushEnabled = await OneSignal.isPushNotificationsEnabled();
    console.log("Push Notifications Enabled:", isPushEnabled);

    // Event Listener (User ne notification allow kiya to trigger hoga)
    OneSignal.on('subscriptionChange', function (isSubscribed) {
        console.log("User Subscription Changed:", isSubscribed);
    });
};
