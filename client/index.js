/*
 *  Step 1: Set authentication (VAPID KEYS) and method to convert it to Uint8Array
 *  Step 2: Register a service worker
 *  Step 3: Request push notification permission on button click and after that send push subscription object to server
 *  Step 4: Unsubscribe a user, if he clicks unsubscribe button
 *  Step 5: Receive a push message and display it as a notification (in sw.js)
 *  Step 6: Open a URL when a user clicks a notification (in sw.js)
 */

// VAPID Key is to identify that the same application is sending the message
// to which you have subscribed and no other application
// You can get the pair of VAPID Keys from 'npx wep-push generate-vapid-keys' command. Or from any online generator.
// We will also add private and public VAPID KEYS in Server Side Code
const VAPID_PUBLIC_KEY = "VAPID_PUBLIC_KEY_VALUE_HERE";
const BASE_URL = "api.something/"; //Base url of the API

const subscribeButton = document.getElementById("subscribe");
const unsubscribeButton = document.getElementById("unsubscribe");
const notifyMeButton = document.getElementById("notify-me");

// Convert a base64 string to Uint8Array.
// Must do this so the server can understand the VAPID_PUBLIC_KEY.
function urlB64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Registering service worker.
//Once it is registered, we can show subscribe button to user.
if ("serviceWorker" in navigator && "PushManager" in window) {
  navigator.serviceWorker
    .register("./sw.js")
    .then((serviceWorkerRegistration) => {
      console.info("Service worker was registered.");
      console.info({ serviceWorkerRegistration });
    })
    .catch((error) => {
      console.error("An error occurred while registering the service worker.");
      console.error(error);
    });
  subscribeButton.disabled = false;
} else {
  console.error("Browser does not support service workers or push messages.");
}

//Listen to subscribe and unsubscribe button click events and call respective functions
subscribeButton.addEventListener("click", subscribeButtonHandler);
unsubscribeButton.addEventListener("click", unsubscribeButtonHandler);

//This function will be called when, user will click subscribe button
//This will send the push subscription object to server
/* 
* Push Subscription object looks something like this:
    {
      "endpoint": "https://some.pushservice.com/something-unique",
      "keys": {
        "p256dh":"BIPUL12DLfytvTajnryr2PRdAgXS3HGKiLqndGcJGabyhHheJYlNGCeXl1dn18gSJ1WAkAPIxr4gK0_dQds4yiI=",
        "auth":"FPssNDTKnInHVndSTdbKFw=="
      }
    }
*/
async function subscribeButtonHandler() {
  // Prevent the user from clicking the subscribe button multiple times.
  subscribeButton.disabled = true;
  //This will ask the user to either allow or deny notifications
  const result = await Notification.requestPermission();
  if (result === "denied") {
    console.error("The user explicitly denied the permission request.");
    return; //return from function if denied
  }
  if (result === "granted") {
    console.info("The user accepted the permission request.");
  }
  //Further check if service worker is was successfully registered
  const registration = await navigator.serviceWorker.getRegistration();
  //As user has granted permission, get the subscription object.
  //This is provided by browser vendors.
  //If we get an object from getSubcription, that means user is already subscribed
  const subscribed = await registration.pushManager.getSubscription();
  if (subscribed) {
    console.info("User is already subscribed.");
    notifyMeButton.disabled = false;
    unsubscribeButton.disabled = false;
    return; //if subscribed return from the function
  }
  //Get the new push subscription object
  const subscription = await registration.pushManager.subscribe({
    //he userVisibleOnly option must be true. It may one day be possible
    //to push messages without displaying user-visible notifications (silent pushes)
    //but browsers currently don't allow that capability because of privacy concerns.
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  notifyMeButton.disabled = false;
  //Send to server and server will store it somewhere
  const url = BASE_URL + "/add-subscription";
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(subscription),
  });
}

//This function will be called when, user will click unsubscribe button
async function unsubscribeButtonHandler() {
  //Check if service worker is still registered
  const registration = await navigator.serviceWorker.getRegistration();
  //We will send endpoint from this subscription object so that server can identify
  //who wants to unsubscribe
  const subscription = await registration.pushManager.getSubscription();
  const url = BASE_URL + "/remove-subscription";
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  const unsubscribed = await subscription.unsubscribe();
  if (unsubscribed) {
    console.info("Successfully unsubscribed from push notifications.");
    unsubscribeButton.disabled = true;
    subscribeButton.disabled = false;
    notifyMeButton.disabled = true;
  }
}

// Logic for the "Notify me" and "Notify all" buttons. For testing purpose.

document.getElementById("notify-me").addEventListener("click", async () => {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration.pushManager.getSubscription();
  const url = BASE_URL + "/notify-me";
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
});

document.getElementById("notify-all").addEventListener("click", async () => {
  const url = BASE_URL + "/notify-all";
  const response = await fetch(url, {
    method: "POST",
  });
  if (response.status === 409) {
    document.getElementById("notification-status-message").textContent =
      "There are no subscribed endpoints to send messages to, yet.";
  }
});
