// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Simple extension to replace lolcat images from
// http://icanhascheezburger.com/ with loldog images instead.

chrome.webRequest.onBeforeRequest.addListener(
  function(info) {
    console.log("Cat intercepted: " + info.url);
    
    return {redirectUrl: "https://www.google.se/logos/doodles/2013/rosalind_franklins_93rd_birthday-2002005-hp.jpg"};
  },
  // filters
  {
    urls: [
      "http://*/*.gif",
      "https://*/*.gif"
    ],
    types: ["image"]
  },
  // extraInfoSpec
  ["blocking"]);
