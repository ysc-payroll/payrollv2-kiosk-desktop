import { h } from 'vue'

// Reusable column renderers
export const StatusColumn = (props) => {
  const { record } = props

  const getStatusClass = (status) => {
    const classes = {
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-green-100 text-green-800',
      disapproved: 'bg-red-100 text-red-800',
      cancelled: 'bg-slate-100 text-slate-800'
    }
    return classes[status] || 'bg-slate-100 text-slate-800'
  }

  return h('div', { class: 'flex flex-col gap-1' }, [
    h('span', {
      class: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium w-fit ${getStatusClass(record.status)}`
    }, record.status_display),
    record.approved_by ? h('div', { class: 'text-xs text-slate-500' }, [
      h('div', null, record.approved_by),
      h('div', null, record.approved_date)
    ]) : null,
    !record.approved_by && record.reviewed_by ? h('div', { class: 'text-xs text-slate-500' }, [
      h('div', null, record.reviewed_by),
      h('div', null, record.reviewed_date)
    ]) : null,
    !record.approved_by && !record.reviewed_by && record.disapproved_by ? h('div', { class: 'text-xs text-slate-500' }, [
      h('div', null, record.disapproved_by),
      h('div', null, record.disapproved_date)
    ]) : null,
    !record.approved_by && !record.reviewed_by && !record.disapproved_by && record.cancelled_by ? h('div', { class: 'text-xs text-slate-500' }, [
      h('div', null, record.cancelled_by),
      h('div', null, record.cancelled_date)
    ]) : null
  ].filter(Boolean))
}

export const AttachmentColumn = (props) => {
  const { record } = props

  const svgPath = 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13'

  return h('svg', {
    class: record.has_attachment ? 'h-5 w-5 mx-auto text-green-500' : 'h-5 w-5 mx-auto text-slate-300',
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    title: record.has_attachment ? 'Has attachment' : 'No attachment'
  }, [
    h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '2',
      d: svgPath
    })
  ])
}

export const AttachmentHeaderIcon = () => {
  const svgPath = 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13'

  return h('svg', {
    class: 'h-4 w-4 mx-auto',
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24'
  }, [
    h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '2',
      d: svgPath
    })
  ])
}

export const ActionsColumn = (props) => {
  const { record, permissions, openDropdownId, toggleDropdown, handleAction } = props

  // openDropdownId can be a ref or a plain value
  const dropdownId = typeof openDropdownId === 'object' && openDropdownId !== null && 'value' in openDropdownId
    ? openDropdownId.value
    : openDropdownId

  return h('div', { class: 'relative inline-block' }, [
    h('button', {
      onClick: () => toggleDropdown(record.id),
      class: 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition'
    }, [
      'Actions',
      h('span', { class: 'w-px h-4 bg-blue-400' }),
      h('svg', {
        class: 'h-4 w-4',
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24'
      }, [
        h('path', {
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': '2',
          d: 'M19 9l-7 7-7-7'
        })
      ])
    ]),
    dropdownId === record.id ? h('div', {
      class: 'absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10'
    }, [
      h('div', { class: 'py-1' }, [
        record.is_editable && permissions.canUpdate ? h('button', {
          onClick: () => handleAction('edit', record),
          class: 'w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2'
        }, [
          h('svg', {
            class: 'h-4 w-4',
            fill: 'none',
            stroke: 'currentColor',
            viewBox: '0 0 24 24'
          }, [
            h('path', {
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
              'stroke-width': '2',
              d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
            })
          ]),
          'Edit'
        ]) : null
      ].filter(Boolean))
    ]) : null
  ])
}

// Base columns that are common across all tables
const baseColumns = [
  {
    key: 'requested_date',
    label: 'Requested Date',
    align: 'left'
  },
  {
    key: 'employee',
    label: 'Employee',
    align: 'left',
    fontWeight: 'medium'
  }
]

const statusAttachmentActionsColumns = [
  {
    key: 'status',
    label: 'Status',
    align: 'left',
    render: StatusColumn
  },
  {
    key: 'has_attachment',
    label: '',
    align: 'center',
    headerComponent: AttachmentHeaderIcon,
    render: AttachmentColumn
  },
  {
    key: 'actions',
    label: 'Actions',
    align: 'right',
    render: ActionsColumn
  }
]

// Overtime Table Configuration
export const overtimeTableConfig = {
  columns: [
    ...baseColumns,
    {
      key: 'application_date',
      label: 'OT Date',
      align: 'left'
    },
    {
      key: 'applied_display',
      label: 'Applied',
      align: 'left'
    },
    {
      key: 'approved_display',
      label: 'Approved',
      align: 'left',
      fallback: '-'
    },
    {
      key: 'reason',
      label: 'Reason',
      align: 'left',
      maxWidth: true,
      tooltip: true,
      fallback: '-'
    },
    ...statusAttachmentActionsColumns
  ]
}

// Holiday Table Configuration
export const holidayTableConfig = {
  columns: [
    ...baseColumns,
    {
      key: 'application_date',
      label: 'Holiday Date',
      align: 'left'
    },
    {
      key: 'applied_display',
      label: 'Applied',
      align: 'left'
    },
    {
      key: 'approved_display',
      label: 'Approved',
      align: 'left',
      fallback: '-'
    },
    {
      key: 'reason',
      label: 'Reason',
      align: 'left',
      maxWidth: true,
      tooltip: true,
      fallback: '-'
    },
    ...statusAttachmentActionsColumns
  ]
}

// Restday Table Configuration
export const restdayTableConfig = {
  columns: [
    ...baseColumns,
    {
      key: 'application_date',
      label: 'Restday Date',
      align: 'left'
    },
    {
      key: 'applied_display',
      label: 'Applied',
      align: 'left'
    },
    {
      key: 'approved_display',
      label: 'Approved',
      align: 'left',
      fallback: '-'
    },
    {
      key: 'reason',
      label: 'Reason',
      align: 'left',
      maxWidth: true,
      tooltip: true,
      fallback: '-'
    },
    ...statusAttachmentActionsColumns
  ]
}

// Undertime Table Configuration
export const undertimeTableConfig = {
  columns: [
    ...baseColumns,
    {
      key: 'application_date',
      label: 'Undertime Date',
      align: 'left'
    },
    {
      key: 'applied_display',
      label: 'Applied',
      align: 'left'
    },
    {
      key: 'approved_display',
      label: 'Approved',
      align: 'left',
      fallback: '-'
    },
    {
      key: 'reason',
      label: 'Reason',
      align: 'left',
      maxWidth: true,
      tooltip: true,
      fallback: '-'
    },
    ...statusAttachmentActionsColumns
  ]
}

// Custom components for Leave table
const LeaveDateRangeColumn = (props) => {
  const { record } = props

  const formatDateRange = (record) => {
    if (record.start_date === record.end_date) {
      return record.start_date
    }
    return `${record.start_date} - ${record.end_date}`
  }

  return h('div', {}, [
    h('div', null, formatDateRange(record)),
    record.terms === 'halfday' ? h('div', { class: 'text-xs text-slate-500 mt-0.5' },
      record.halfday_is_first_half ? '(First Half)' : '(Second Half)'
    ) : null
  ].filter(Boolean))
}

const LeaveCreditsColumn = (props) => {
  const { record } = props

  const formatCredits = (credits) => {
    if (credits === null || credits === undefined) return '-'
    return Number(credits).toFixed(1)
  }

  return formatCredits(record.credits)
}

const LeaveAppliedColumn = (props) => {
  const { record } = props

  const formatCredits = (credits) => {
    if (credits === null || credits === undefined) return '-'
    return Number(credits).toFixed(1)
  }

  return formatCredits(record.original_credits)
}

const LeaveApprovedColumn = (props) => {
  const { record } = props

  const formatCredits = (credits) => {
    if (credits === null || credits === undefined) return '-'
    return Number(credits).toFixed(1)
  }

  return record.status === 'approved' ? formatCredits(record.credits) : '-'
}

// Leave Table Configuration
export const leaveTableConfig = {
  columns: [
    ...baseColumns,
    {
      key: 'leave_type_display',
      label: 'Leave Type',
      align: 'left'
    },
    {
      key: 'date_range',
      label: 'Date Range',
      align: 'left',
      render: LeaveDateRangeColumn
    },
    {
      key: 'credits',
      label: 'Credits',
      align: 'left',
      render: LeaveCreditsColumn
    },
    {
      key: 'original_credits',
      label: 'Applied',
      align: 'left',
      render: LeaveAppliedColumn
    },
    {
      key: 'approved_credits',
      label: 'Approved',
      align: 'left',
      render: LeaveApprovedColumn
    },
    {
      key: 'reason',
      label: 'Reason',
      align: 'left',
      maxWidth: true,
      tooltip: true,
      fallback: '-'
    },
    ...statusAttachmentActionsColumns
  ]
}
