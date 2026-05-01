/**
 * Centralized icon definitions using @expo/vector-icons
 * Provides consistent icon usage across the app
 */
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';

// Type for icon names
export type AppIconName = keyof typeof Ionicons.glyphMap;

// Icon sizes
export const IconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
} as const;

// Common icons used throughout the app
export const Icons = {
  // Navigation & Actions
  back: (size?: number) => <Ionicons name="chevron-back" size={size ?? IconSize.md} />,
  close: (size?: number) => <Ionicons name="close" size={size ?? IconSize.md} />,
  menu: (size?: number) => <Ionicons name="menu" size={size ?? IconSize.md} />,
  moreVertical: (size?: number) => <Ionicons name="ellipsis-vertical" size={size ?? IconSize.md} />,
  
  // Chat & Messages
  send: (size?: number, color?: string) => <Ionicons name="send" size={size ?? IconSize.md} color={color} />,
  attach: (size?: number) => <Ionicons name="attach" size={size ?? IconSize.md} />,
  chatbubbles: (size?: number) => <Ionicons name="chatbubbles" size={size ?? IconSize.md} />,
  chatbubblesOutline: (size?: number) => <Ionicons name="chatbubbles-outline" size={size ?? IconSize.md} />,
  chatbubbleOutline: (size?: number) => <Ionicons name="chatbubbles-outline" size={size ?? IconSize.md} />,
  mic: (size?: number) => <Ionicons name="mic" size={size ?? IconSize.md} />,
  camera: (size?: number) => <Ionicons name="camera" size={size ?? IconSize.md} />,
  image: (size?: number) => <Ionicons name="image" size={size ?? IconSize.md} />,
  document: (size?: number) => <Ionicons name="document" size={size ?? IconSize.md} />,
  paperPlane: (size?: number) => <Ionicons name="paper-plane" size={size ?? IconSize.md} />,
  checkmark: (size?: number) => <Ionicons name="checkmark" size={size ?? IconSize.md} />,
  checkmarkDone: (size?: number) => <Ionicons name="checkmark-done" size={size ?? IconSize.md} />,
  
  // Users & Contacts
  person: (size?: number) => <Ionicons name="person" size={size ?? IconSize.md} />,
  personAdd: (size?: number) => <Ionicons name="person-add" size={size ?? IconSize.md} />,
  people: (size?: number) => <Ionicons name="people" size={size ?? IconSize.md} />,
  peopleOutline: (size?: number) => <Ionicons name="people-outline" size={size ?? IconSize.md} />,
  userGroup: (size?: number) => <MaterialCommunityIcons name="account-group" size={size ?? IconSize.md} />,
  userPlus: (size?: number) => <Feather name="user-plus" size={size ?? IconSize.md} />,
  userCheck: (size?: number) => <Feather name="user-check" size={size ?? IconSize.md} />,
  userX: (size?: number) => <Feather name="user-x" size={size ?? IconSize.md} />,
  user: (size?: number) => <Feather name="user" size={size ?? IconSize.md} />,
  contactBook: (size?: number) => <MaterialCommunityIcons name="contacts" size={size ?? IconSize.md} />,
  
  // Groups
  groupAdd: (size?: number) => <MaterialCommunityIcons name="account-multiple-plus" size={size ?? IconSize.md} />,
  groupChat: (size?: number) => <MaterialCommunityIcons name="account-group" size={size ?? IconSize.md} />,
  exitToApp: (size?: number) => <MaterialCommunityIcons name="exit-to-app" size={size ?? IconSize.md} />,
  
  // Search & Find
  search: (size?: number) => <Ionicons name="search" size={size ?? IconSize.md} />,
  filter: (size?: number) => <Ionicons name="options" size={size ?? IconSize.md} />,
  
  // Social & Status
  heart: (size?: number) => <Ionicons name="heart" size={size ?? IconSize.md} />,
  heartOutline: (size?: number) => <Ionicons name="heart-outline" size={size ?? IconSize.md} />,
  star: (size?: number) => <Ionicons name="star" size={size ?? IconSize.md} />,
  starOutline: (size?: number) => <Ionicons name="star-outline" size={size ?? IconSize.md} />,
  thumbsUp: (size?: number) => <Ionicons name="thumbs-up" size={size ?? IconSize.md} />,
  share: (size?: number) => <Ionicons name="share" size={size ?? IconSize.md} />,
  shareOutline: (size?: number) => <Ionicons name="share-outline" size={size ?? IconSize.md} />,
  
  // Communication
  call: (size?: number) => <Ionicons name="call" size={size ?? IconSize.md} />,
  callOutline: (size?: number) => <Ionicons name="call-outline" size={size ?? IconSize.md} />,
  videocam: (size?: number) => <Ionicons name="videocam" size={size ?? IconSize.md} />,
  mail: (size?: number) => <Ionicons name="mail" size={size ?? IconSize.md} />,
  mailOutline: (size?: number) => <Ionicons name="mail-outline" size={size ?? IconSize.md} />,
  
  // Security & Privacy
  lock: (size?: number) => <Ionicons name="lock-closed" size={size ?? IconSize.md} />,
  lockOpen: (size?: number) => <Ionicons name="lock-open" size={size ?? IconSize.md} />,
  shield: (size?: number) => <Ionicons name="shield-checkmark" size={size ?? IconSize.md} />,
  eye: (size?: number) => <Ionicons name="eye" size={size ?? IconSize.md} />,
  eyeOff: (size?: number) => <Ionicons name="eye-off" size={size ?? IconSize.md} />,
  
  // Settings & Tools
  settings: (size?: number) => <Ionicons name="settings" size={size ?? IconSize.md} />,
  settingsOutline: (size?: number) => <Ionicons name="settings-outline" size={size ?? IconSize.md} />,
  cog: (size?: number) => <Feather name="settings" size={size ?? IconSize.md} />,
  edit: (size?: number) => <Feather name="edit-2" size={size ?? IconSize.md} />,
  edit3: (size?: number) => <Feather name="edit-3" size={size ?? IconSize.md} />,
  trash: (size?: number) => <Feather name="trash-2" size={size ?? IconSize.md} />,
  copy: (size?: number) => <Feather name="copy" size={size ?? IconSize.md} />,
  download: (size?: number) => <Feather name="download" size={size ?? IconSize.md} />,
  upload: (size?: number) => <Feather name="upload" size={size ?? IconSize.md} />,
  
  // Notifications
  notifications: (size?: number) => <Ionicons name="notifications" size={size ?? IconSize.md} />,
  notificationsOutline: (size?: number) => <Ionicons name="notifications-outline" size={size ?? IconSize.md} />,
  bell: (size?: number) => <Ionicons name="notifications" size={size ?? IconSize.md} />,
  bellOff: (size?: number) => <Ionicons name="notifications-off" size={size ?? IconSize.md} />,
  
  // Media
  play: (size?: number) => <Ionicons name="play" size={size ?? IconSize.md} />,
  pause: (size?: number) => <Ionicons name="pause" size={size ?? IconSize.md} />,
  stop: (size?: number) => <Ionicons name="stop" size={size ?? IconSize.md} />,
  playCircle: (size?: number) => <Ionicons name="play-circle" size={size ?? IconSize.md} />,
  musicalNotes: (size?: number) => <Ionicons name="musical-notes" size={size ?? IconSize.md} />,
  
  // Location
  location: (size?: number) => <Ionicons name="location" size={size ?? IconSize.md} />,
  mapPin: (size?: number) => <Feather name="map-pin" size={size ?? IconSize.md} />,
  
  // Actions
  add: (size?: number) => <Ionicons name="add" size={size ?? IconSize.md} />,
  addCircle: (size?: number) => <Ionicons name="add-circle" size={size ?? IconSize.md} />,
  remove: (size?: number) => <Ionicons name="remove" size={size ?? IconSize.md} />,
  removeCircle: (size?: number) => <Ionicons name="remove-circle" size={size ?? IconSize.md} />,
  checkCircle: (size?: number) => <Ionicons name="checkmark-circle" size={size ?? IconSize.md} />,
  checkCircleOutline: (size?: number) => <Ionicons name="checkmark-circle-outline" size={size ?? IconSize.md} />,
  alertCircle: (size?: number) => <Ionicons name="alert-circle" size={size ?? IconSize.md} />,
  informationCircle: (size?: number) => <Ionicons name="information-circle" size={size ?? IconSize.md} />,
  helpCircle: (size?: number) => <Ionicons name="help-circle" size={size ?? IconSize.md} />,
  
  // Navigation
  home: (size?: number) => <Ionicons name="home" size={size ?? IconSize.md} />,
  homeOutline: (size?: number) => <Ionicons name="home-outline" size={size ?? IconSize.md} />,
  compass: (size?: number) => <Ionicons name="compass" size={size ?? IconSize.md} />,
  compassOutline: (size?: number) => <Ionicons name="compass-outline" size={size ?? IconSize.md} />,
  folder: (size?: number) => <Ionicons name="folder" size={size ?? IconSize.md} />,
  folderOutline: (size?: number) => <Ionicons name="folder-outline" size={size ?? IconSize.md} />,
  layers: (size?: number) => <Ionicons name="layers" size={size ?? IconSize.md} />,
  grid: (size?: number) => <Ionicons name="grid" size={size ?? IconSize.md} />,
  list: (size?: number) => <Ionicons name="list" size={size ?? IconSize.md} />,
  
  // Time
  time: (size?: number) => <Ionicons name="time" size={size ?? IconSize.md} />,
  clock: (size?: number) => <Ionicons name="time-outline" size={size ?? IconSize.md} />,
  calendar: (size?: number) => <Ionicons name="calendar" size={size ?? IconSize.md} />,
  timer: (size?: number) => <Ionicons name="timer" size={size ?? IconSize.md} />,
  
  // Network & Status
  wifi: (size?: number) => <Ionicons name="wifi" size={size ?? IconSize.md} />,
  airplane: (size?: number) => <Ionicons name="airplane" size={size ?? IconSize.md} />,
  cloud: (size?: number) => <Ionicons name="cloud" size={size ?? IconSize.md} />,
  cloudOutline: (size?: number) => <Ionicons name="cloud-outline" size={size ?? IconSize.md} />,
  cloudDone: (size?: number) => <Ionicons name="cloud-done" size={size ?? IconSize.md} />,
  cloudOffline: (size?: number) => <Ionicons name="cloud-offline" size={size ?? IconSize.md} />,
  refresh: (size?: number) => <Ionicons name="refresh" size={size ?? IconSize.md} />,
  sync: (size?: number) => <Ionicons name="sync" size={size ?? IconSize.md} />,
  
  // Arrows
  arrowBack: (size?: number) => <Ionicons name="arrow-back" size={size ?? IconSize.md} />,
  arrowForward: (size?: number) => <Ionicons name="arrow-forward" size={size ?? IconSize.md} />,
  arrowUp: (size?: number) => <Ionicons name="arrow-up" size={size ?? IconSize.md} />,
  arrowDown: (size?: number) => <Ionicons name="arrow-down" size={size ?? IconSize.md} />,
  chevronRight: (size?: number) => <Ionicons name="chevron-forward" size={size ?? IconSize.md} />,
  chevronLeft: (size?: number) => <Ionicons name="chevron-back" size={size ?? IconSize.md} />,
  arrowUndo: (size?: number) => <Feather name="corner-down-left" size={size ?? IconSize.md} />,
  
  // Files
  file: (size?: number) => <Ionicons name="document" size={size ?? IconSize.md} />,
  fileText: (size?: number) => <Ionicons name="document-text" size={size ?? IconSize.md} />,
  
  // General
  globe: (size?: number) => <Ionicons name="globe" size={size ?? IconSize.md} />,
  link: (size?: number) => <Ionicons name="link" size={size ?? IconSize.md} />,
  linkExternal: (size?: number) => <Ionicons name="open-outline" size={size ?? IconSize.md} />,
  code: (size?: number) => <Ionicons name="code" size={size ?? IconSize.md} />,
  key: (size?: number) => <Feather name="key" size={size ?? IconSize.md} />,
  flag: (size?: number) => <Feather name="flag" size={size ?? IconSize.md} />,
  bookmark: (size?: number) => <Ionicons name="bookmark" size={size ?? IconSize.md} />,
  bookmarkOutline: (size?: number) => <Ionicons name="bookmark-outline" size={size ?? IconSize.md} />,
  pin: (size?: number) => <Ionicons name="pin" size={size ?? IconSize.md} />,
  pushPin: (size?: number) => <MaterialCommunityIcons name="pin" size={size ?? IconSize.md} />,
  pinOff: (size?: number) => <MaterialCommunityIcons name="pin-off" size={size ?? IconSize.md} />,
  
  // Visibility
  visibility: (size?: number) => <Ionicons name="eye" size={size ?? IconSize.md} />,
  visibilityOff: (size?: number) => <Ionicons name="eye-off" size={size ?? IconSize.md} />,
  
  // Chat specific
  messageCircle: (size?: number) => <Feather name="message-circle" size={size ?? IconSize.md} />,
  messageSquare: (size?: number) => <Feather name="message-square" size={size ?? IconSize.md} />,
  
  // Lock & Unlock  
  unlock: (size?: number) => <Ionicons name="lock-open" size={size ?? IconSize.md} />,
  shieldOutline: (size?: number) => <Ionicons name="shield-outline" size={size ?? IconSize.md} />,
  
  // Phone & Contact
  phone: (size?: number) => <Ionicons name="call" size={size ?? IconSize.md} />,
  phonePortrait: (size?: number) => <Ionicons name="phone-portrait" size={size ?? IconSize.md} />,
  
  // Reply & Forward
  reply: (size?: number) => <Ionicons name="arrow-undo" size={size ?? IconSize.md} />,
  replyAll: (size?: number) => <Ionicons name="arrow-undo-circle" size={size ?? IconSize.md} />,
  returnRight: (size?: number) => <MaterialCommunityIcons name="keyboard-return" size={size ?? IconSize.md} />,
  
  // Delete
  delete: (size?: number) => <Ionicons name="trash" size={size ?? IconSize.md} />,
  deleteOutline: (size?: number) => <Ionicons name="trash-outline" size={size ?? IconSize.md} />,
  
  // Expand
  expand: (size?: number) => <Ionicons name="expand" size={size ?? IconSize.md} />,
  collapse: (size?: number) => <Ionicons name="contract" size={size ?? IconSize.md} />,
  
  // More options
  more: (size?: number) => <Ionicons name="ellipsis-horizontal" size={size ?? IconSize.md} />,
  moreCircle: (size?: number) => <Ionicons name="ellipsis-horizontal-circle" size={size ?? IconSize.md} />,
  
  // Verification
  verified: (size?: number) => <Ionicons name="checkmark-circle" size={size ?? IconSize.md} />,
  verifiedOutline: (size?: number) => <Ionicons name="checkmark-circle-outline" size={size ?? IconSize.md} />,
  
  // Photos
  imageOutline: (size?: number) => <Ionicons name="image-outline" size={size ?? IconSize.md} />,
  images: (size?: number) => <Ionicons name="images" size={size ?? IconSize.md} />,
  cameraOutline: (size?: number) => <Ionicons name="camera-outline" size={size ?? IconSize.md} />,
  
  // Phone book
  book: (size?: number) => <Ionicons name="book" size={size ?? IconSize.md} />,
  bookOutline: (size?: number) => <Ionicons name="book-outline" size={size ?? IconSize.md} />,
  peopleCircle: (size?: number) => <MaterialCommunityIcons name="account-group" size={size ?? IconSize.md} />,
  
  // Chat actions
  arrowRoundUp: (size?: number, color?: string) => <Ionicons name="arrow-up-circle" size={size ?? IconSize.lg} color={color} />,
  
  // Log out
  logOut: (size?: number) => <Ionicons name="log-out" size={size ?? IconSize.md} />,
  exit: (size?: number) => <MaterialCommunityIcons name="exit-to-app" size={size ?? IconSize.md} />,
  
  // Mute
  mute: (size?: number) => <Ionicons name="notifications-off" size={size ?? IconSize.md} />,
  volumeHigh: (size?: number) => <Ionicons name="volume-high" size={size ?? IconSize.md} />,
  volumeOff: (size?: number) => <Ionicons name="volume-off" size={size ?? IconSize.md} />,
} as const;

export default Icons;
