const cacheName = "cache-v1"; //you may give any name (Change it to update user's cache)
const resourcesToPrecache = [
  "/",
  "./index.html",
  "./index.js",
  // "./src/index.css",
  // "./images/logo192.png",
  // "./images/logo512.png",
];

//self here is sw object
self.addEventListener("install", (event) => {
  console.log("Installing!");
  event.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache.addAll(resourcesToPrecache);
    })
  );
});
//cache variable inside then() stores the cache object returned by the caches.open()
//caches.open will return immediately even if the cache is not yet ready.
//So we make it wait, by event.waitUntil()

// sw activation (We are deleting the old cached files if any)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== cacheName)
          .map((key) => {
            caches.delete(key);
          })
      );
    })
  );
  console.log("Service Worker has been activated");
});

//now we have stored the data in cache, now it needs to be fetched,
//'fetch' event object has a request key, whih stores the url/file being requested from network.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
//if the cache doesnt have any data, then null is stored in cachedResponse variable
//if cachedResponse has data it is returned, if it stores null, then
//fetch(event.request) is called. (network)
//This is known as cache-first methodology.

/*      PUSH SERVICE STARTS HERE        */

//This event listener will listen to the push notification that arrive and will show basic notification, we can add options to the notifications
self.addEventListener("push", (e) => {
  var body;

  if (e.data) {
    body = e.data.text();
  } else {
    body = "Push message no payload";
  }

  var options = {
    body: body,
    icon: "",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: "2",
    },
    actions: [
      {
        action: "explore",
        title: "Go to the url",
        icon: "",
      },
    ],
  };
  self.registration.showNotification("This is the title", options);
});

self.addEventListener("notificationclick", (event) => {
  // Basic handler
  //Close the notification and open the url. We can send the URL in notification data as well.
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow("https://github.com/shubhamsaxena924/")
  );
});
