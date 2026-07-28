import { gettext } from 'i18n'

AppSettingsPage({
  build() {
    return View({
      style: { padding: '12px', background: '#F2F3F5' }
    }, [
      Text({
        style: { fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' },
        text: gettext('settingTitle')
      }),

      View({
        style: {
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '14px',
          marginBottom: '12px'
        }
      }, [
        Text({
          style: { fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' },
          text: gettext('watchSettings')
        }),
        Text({
          style: { fontSize: '13px', color: '#666' },
          text: gettext('watchSettingsNote')
        })
      ]),

      View({
        style: {
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '14px',
          marginBottom: '12px'
        }
      }, [
        Text({
          style: { fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' },
          text: gettext('settingGaokao')
        }),
        Text({
          style: { fontSize: '13px', color: '#666' },
          text: gettext('settingGaokaoNote')
        })
      ]),

      View({
        style: {
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '14px',
          marginBottom: '12px'
        }
      }, [
        Text({
          style: { fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' },
          text: gettext('settingAbout')
        }),
        Text({
          style: { fontSize: '13px', color: '#666' },
          text: gettext('settingAboutText')
        })
      ])
    ])
  }
})
