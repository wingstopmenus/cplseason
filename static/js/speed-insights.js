/**
 * Vercel Speed Insights initialization for CPL Season
 * Tracks web vitals and performance metrics
 */
(function() {
  'use strict';
  
  // Speed Insights configuration
  var config = {
    debug: false,
    sampleRate: 1.0
  };
  
  // Initialize Speed Insights
  // The script will be loaded from Vercel's CDN when deployed
  if (typeof window !== 'undefined') {
    window.si = window.si || function() {
      (window.siq = window.siq || []).push(arguments);
    };
  }
})();
