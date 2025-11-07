// Dialog configurations for different application types

export const overtimeDialogConfig = {
  resourceName: 'Overtime',
  dateLabel: 'Overtime Date',
  dateField: 'application_date',
  reasonPlaceholder: 'Brief explanation for overtime work...',
  titles: {
    create: 'New Overtime Request',
    edit: 'Edit Overtime Application',
    view: 'Overtime Application Details',
    cancel: 'Cancel Overtime',
    delete: 'Delete Overtime Application'
  },
  deleteConfirmation: {
    title: 'Delete Overtime Application',
    message: 'Are you sure you want to delete this overtime application? This action cannot be undone.'
  }
}

export const holidayDialogConfig = {
  resourceName: 'Holiday',
  dateLabel: 'Holiday Date',
  dateField: 'application_date',
  reasonPlaceholder: 'Brief explanation for holiday work...',
  titles: {
    create: 'New Holiday Work Request',
    edit: 'Edit Holiday Application',
    view: 'Holiday Application Details',
    cancel: 'Cancel Holiday',
    delete: 'Delete Holiday Application'
  },
  deleteConfirmation: {
    title: 'Delete Holiday Application',
    message: 'Are you sure you want to delete this holiday application? This action cannot be undone.'
  }
}

export const restdayDialogConfig = {
  resourceName: 'Restday',
  dateLabel: 'Restday Date',
  dateField: 'application_date',
  reasonPlaceholder: 'Brief explanation for restday work...',
  titles: {
    create: 'New Restday Work Request',
    edit: 'Edit Restday Application',
    view: 'Restday Application Details',
    cancel: 'Cancel Restday',
    delete: 'Delete Restday Application'
  },
  deleteConfirmation: {
    title: 'Delete Restday Application',
    message: 'Are you sure you want to delete this restday application? This action cannot be undone.'
  }
}

export const undertimeDialogConfig = {
  resourceName: 'Undertime',
  dateLabel: 'Undertime Date',
  dateField: 'application_date',
  reasonPlaceholder: 'Brief explanation for undertime...',
  titles: {
    create: 'New Undertime Request',
    edit: 'Edit Undertime Application',
    view: 'Undertime Application Details',
    cancel: 'Cancel Undertime',
    delete: 'Delete Undertime Application'
  },
  deleteConfirmation: {
    title: 'Delete Undertime Application',
    message: 'Are you sure you want to delete this undertime application? This action cannot be undone.'
  }
}
