import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

// Bundled product illustrations: unlike remote category thumbnails, these are
// visible on the very first frame and never compete with product image requests.
const CategoryIllustration = ({ kind, size = 70 }) => {
  const ink = '#123F32';
  const face = '#F8FFFD';
  const accent = '#38A77A';
  let art;
  switch (kind) {
    case 'phone':
      art = <G rotation="-12" origin="36,36"><Rect x="20" y="5" width="34" height="61" rx="7" fill={ink}/><Rect x="23" y="9" width="28" height="52" rx="4" fill={face}/><Path d="M23 43 Q39 22 51 26 V61 H23Z" fill={accent}/><Rect x="31" y="11" width="12" height="3" rx="1.5" fill={ink}/><Circle cx="37" cy="63" r="1" fill={face}/></G>;
      break;
    case 'laptop':
      art = <G><Rect x="11" y="12" width="51" height="38" rx="4" fill={ink}/><Rect x="14" y="15" width="45" height="31" rx="2" fill={face}/><Path d="M14 39 L41 15 H59 V46 H14Z" fill="#BDEED6"/><Path d="M4 52 H68 L62 58 H10Z" fill={ink}/><Path d="M27 53 H45 L43 55 H29Z" fill="#8CCBAC"/></G>;
      break;
    case 'fridge':
      art = <G rotation="-5" origin="36,36"><Rect x="19" y="5" width="36" height="62" rx="5" fill={ink}/><Rect x="22" y="8" width="30" height="25" rx="3" fill={face}/><Rect x="22" y="36" width="30" height="28" rx="3" fill="#E5F9EE"/><Rect x="46" y="23" width="2" height="8" rx="1" fill={accent}/><Rect x="46" y="40" width="2" height="9" rx="1" fill={accent}/><Rect x="24" y="66" width="5" height="2" fill={ink}/><Rect x="45" y="66" width="5" height="2" fill={ink}/></G>;
      break;
    case 'tv':
      art = <G><Rect x="6" y="12" width="60" height="40" rx="5" fill={ink}/><Rect x="9" y="15" width="54" height="34" rx="2" fill="#E7FFF2"/><Path d="M9 42 Q29 16 63 23 V49 H9Z" fill={accent}/><Path d="M9 48 Q28 30 63 34 V49 H9Z" fill="#79DAB0"/><Rect x="33" y="52" width="6" height="7" fill={ink}/><Rect x="24" y="59" width="25" height="3" rx="1.5" fill={ink}/></G>;
      break;
    case 'speaker':
      art = <G rotation="-8" origin="36,36"><Rect x="19" y="7" width="35" height="59" rx="7" fill={ink}/><Rect x="22" y="11" width="29" height="51" rx="5" fill="#315E4B"/><Circle cx="36.5" cy="43" r="13" fill="#B3E4C8"/><Circle cx="36.5" cy="43" r="8" fill={ink}/><Circle cx="36.5" cy="43" r="3" fill={accent}/><Circle cx="36.5" cy="21" r="6" fill="#9DD6B7"/><Circle cx="36.5" cy="21" r="3" fill={ink}/></G>;
      break;
    case 'headphones':
      art = <G><Path d="M15 43 V33 A21 21 0 0 1 57 33 V43" fill="none" stroke={ink} strokeWidth="8" strokeLinecap="round"/><Rect x="11" y="38" width="13" height="23" rx="6" fill={ink}/><Rect x="48" y="38" width="13" height="23" rx="6" fill={ink}/><Rect x="15" y="42" width="6" height="15" rx="3" fill={accent}/><Rect x="51" y="42" width="6" height="15" rx="3" fill={accent}/></G>;
      break;
    case 'ac':
      art = <G><Rect x="5" y="17" width="62" height="29" rx="6" fill={ink}/><Rect x="8" y="19" width="56" height="23" rx="4" fill={face}/><Line x1="13" y1="34" x2="59" y2="34" stroke={accent} strokeWidth="2"/><Circle cx="57" cy="26" r="2" fill={accent}/><Path d="M20 50 q-5 5 0 10 M36 50 q-5 5 0 10 M52 50 q-5 5 0 10" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round"/></G>;
      break;
    default:
      art = <G><Rect x="16" y="4" width="41" height="64" rx="6" fill={ink}/><Rect x="19" y="9" width="35" height="54" rx="4" fill={face}/><Circle cx="36.5" cy="37" r="18" fill="#B7EBCF" stroke={ink} strokeWidth="2"/><Circle cx="36.5" cy="37" r="11" fill={ink}/><Path d="M32 37 Q42 26 45 38 Q39 47 32 37Z" fill={accent}/><Circle cx="36.5" cy="37" r="2" fill={face}/></G>;
  }
  return <Svg width={size} height={size} viewBox="0 0 72 72" accessible={false}><Ellipse cx="36" cy="66" rx="27" ry="3" fill="#086942" opacity="0.16"/>{art}</Svg>;
};

export default React.memo(CategoryIllustration);
