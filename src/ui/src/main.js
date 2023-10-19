import { createApp } from "vue";
import App from "./App.vue";
import { GHL } from "./ghl";

const ghl = new GHL();
window.ghl = ghl;

createApp(App).mount("#app");
