import "./chunk-FALMGPZC.js";
import "./chunk-GOGVFLWM.js";
import "./chunk-GZAMJ7HK.js";
import "./chunk-JUHKQ5UI.js";
import "./chunk-ABW4F3ZX.js";
import "./chunk-KJFMGZO5.js";
import "./chunk-ZHQO54CE.js";
import {
  customElement
} from "./chunk-RMWTWYKC.js";
import "./chunk-JLS7QRTL.js";
import "./chunk-H25E2Z3P.js";
import "./chunk-D2SILJEM.js";
import "./chunk-VTHNKRVG.js";
import {
  LitElement,
  css,
  html
} from "./chunk-366LDVMV.js";
import "./chunk-D6VRBZP6.js";
import "./chunk-OMO2FGGE.js";
import "./chunk-IW7JHH32.js";
import "./chunk-OZTVGCGN.js";
import "./chunk-OFXHVVVC.js";
import "./chunk-F7YG2VMH.js";
import "./chunk-SM5OAV2N.js";
import "./chunk-5XBGTDLQ.js";
import "./chunk-Y5VHFJ5N.js";
import "./chunk-OS7ZSSJM.js";

// node_modules/@reown/appkit-scaffold-ui/dist/esm/src/views/w3m-transactions-view/styles.js
var styles_default = css`
  :host > wui-flex:first-child {
    height: 500px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  :host > wui-flex:first-child::-webkit-scrollbar {
    display: none;
  }
`;

// node_modules/@reown/appkit-scaffold-ui/dist/esm/src/views/w3m-transactions-view/index.js
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var W3mTransactionsView = class W3mTransactionsView2 extends LitElement {
  render() {
    return html`
      <wui-flex flexDirection="column" .padding=${["0", "m", "m", "m"]} gap="s">
        <w3m-activity-list page="activity"></w3m-activity-list>
      </wui-flex>
    `;
  }
};
W3mTransactionsView.styles = styles_default;
W3mTransactionsView = __decorate([
  customElement("w3m-transactions-view")
], W3mTransactionsView);
export {
  W3mTransactionsView
};
//# sourceMappingURL=transactions-DC4KMI3S.js.map
