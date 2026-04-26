import {
  MdAccountTree,
  MdAccountCircle,
  MdAdd,
  MdAddPhotoAlternate,
  MdArchitecture,
  MdArrowUpward,
  MdArrowRightAlt,
  MdAttachFile,
  MdAutorenew,
  MdAutoAwesome,
  MdBackupTable,
  MdBrush,
  MdCheckBoxOutlineBlank,
  MdCheck,
  MdClose,
  MdCode,
  MdDataObject,
  MdDateRange,
  MdDelete,
  MdDeviceHub,
  MdDiamond,
  MdDownload,
  MdDriveFileRenameOutline,
  MdEast,
  MdCenterFocusStrong,
  MdFormatPaint,
  MdGesture,
  MdHexagon,
  MdHistory,
  MdHub,
  MdImage,
  MdInsertPhoto,
  MdIntegrationInstructions,
  MdKeyboardArrowDown,
  MdKeyboardArrowLeft,
  MdMemory,
  MdNorthEast,
  MdOpenWith,
  MdRadioButtonUnchecked,
  MdRefresh,
  MdRemove,
  MdSchema,
  MdSearch,
  MdShowChart,
  MdStorage,
  MdTimeline,
  MdTouchApp,
  MdTune,
  MdUndo,
  MdRedo,
  MdVisibility,
  MdDashboard,
  MdDonutLarge,
  MdViewInAr,
  MdZoomIn,
  MdZoomOut,
} from 'react-icons/md';

const googleIcon = (Icon, minSize = 16) => {
  const GoogleIcon = ({ size = 20, strokeWidth, ...props }) => {
    const numericSize = Number(size);
    const resolvedSize = Number.isFinite(numericSize) ? Math.max(numericSize, minSize) : size;

    return <Icon size={resolvedSize} {...props} />;
  };

  return GoogleIcon;
};

export const Search = googleIcon(MdSearch);
export const User = googleIcon(MdAccountCircle);
export const ArrowUp = googleIcon(MdNorthEast);
export const Send = googleIcon(MdArrowUpward);
export const Layout = googleIcon(MdDashboard);
export const Zap = googleIcon(MdAutoAwesome);
export const Boxes = googleIcon(MdViewInAr);
export const Plus = googleIcon(MdAdd);
export const Network = googleIcon(MdSchema);
export const Layers = googleIcon(MdArchitecture);
export const LineChart = googleIcon(MdShowChart);
export const PieChart = googleIcon(MdDonutLarge);
export const ChevronLeft = googleIcon(MdKeyboardArrowLeft);
export const Grid = googleIcon(MdDashboard);
export const Paintbrush = googleIcon(MdFormatPaint);
export const ImagePlus = googleIcon(MdAddPhotoAlternate);
export const Paperclip = googleIcon(MdAttachFile);
export const GitBranch = googleIcon(MdDeviceHub);
export const Image = googleIcon(MdImage);
export const PenTool = googleIcon(MdDriveFileRenameOutline);
export const SlidersHorizontal = googleIcon(MdTune);
export const ArrowDown = googleIcon(MdKeyboardArrowDown);
export const History = googleIcon(MdHistory);
export const X = googleIcon(MdClose);
export const MessageSquareDot = googleIcon(MdTimeline);
export const Table2 = googleIcon(MdBackupTable);
export const CalendarRange = googleIcon(MdDateRange);

export const Trash2 = googleIcon(MdDelete);
export const Download = googleIcon(MdDownload);
export const Palette = googleIcon(MdFormatPaint);
export const MousePointer2 = googleIcon(MdTouchApp);
export const Move = googleIcon(MdOpenWith);
export const Undo = googleIcon(MdUndo);
export const Redo = googleIcon(MdRedo);
export const ZoomIn = googleIcon(MdZoomIn);
export const ZoomOut = googleIcon(MdZoomOut);
export const Maximize = googleIcon(MdCenterFocusStrong);
export const Check = googleIcon(MdCheck);
export const ChevronDown = googleIcon(MdKeyboardArrowDown);
export const FileCode = googleIcon(MdIntegrationInstructions);
export const FileText = googleIcon(MdDataObject);
export const FileImage = googleIcon(MdInsertPhoto);
export const Code2 = googleIcon(MdCode);
export const Minus = googleIcon(MdRemove);
export const Cpu = googleIcon(MdMemory);
export const Square = googleIcon(MdCheckBoxOutlineBlank);
export const Circle = googleIcon(MdRadioButtonUnchecked);
export const Hexagon = googleIcon(MdHexagon);
export const Database = googleIcon(MdStorage);
export const MessageSquare = googleIcon(MdTimeline);
export const Diamond = googleIcon(MdDiamond);
export const Box = googleIcon(MdViewInAr);
export const ArrowRight = googleIcon(MdEast);
export const Eye = googleIcon(MdVisibility);
export const RefreshCw = googleIcon(MdRefresh);
export const Loader2 = googleIcon(MdAutorenew);
export const Brush = googleIcon(MdGesture);
