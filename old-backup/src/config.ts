/* eslint-disable prettier/prettier */
export const CONFIG = {
  username: ["maddog"],

  buildOrder: [
      // towers
      {
          3: [
              '       T',
              '    A   ',
              '        ',
          ],
      },
      // containers
      {
          4: [
              '  C     ',
              '    A   ',
              '        ',
          ]
      },
      {
          // 5 extensions
          2: [
              '    E    ',
              '         ',
              ' EE A EE ',
              '         ',
              '         ',
          ],

          // 10 extensions
          // 1 tower
          3: [
              '      E     ',
              '            ',
              '   EE A EE  ',
              '            ',
              '    EEE EE  ',
          ],

          // 20 extensions
          // 1 tower
          4: [
              '   EE EE',
              '    EEE ',
              '  C    T',
              ' EE A EE',
              '      C ',
              '  EEE EE',
              ' EE EE  ',
          ],

          // 30 extensions
          // 2 towers
          5: [
              '                 ',
              '     E EETEE     ',
              '     EE EEE      ',
              '      C    T     ',
              '     EE A EE     ',
              '          C E    ',
              '      EEE EE     ',
              '     EE EE E     ',
              '                 ',
          ],

          // 40 extensions
          // 2 towers
          // 3 labs
          6: [
              '                 ',
              '     E EETEE     ',
              '     EE EEE LL   ',
              '      C    T L   ',
              '     EE A EE     ',
              '          C E    ',
              '      EEE EE     ',
              '     EE EE E     ',
              '                 ',
          ],

          // 50 extensions
          // 3 towers
          // 6 labs
          7: [
              '                 ',
              '     E EETEE L   ',
              '     EE EEE LLL  ',
              '      C    T LL  ',
              '     EE A EE     ',
              '          CTE    ',
              '      EEE EE     ',
              '     EE EE E     ',
              '                 ',
          ],

          // 60 extensions
          // 6 towers
          // 10 labs
          8: [
              '                 ',
              '     E EETEE LL  ',
              '     EE EEE LLLL ',
              '     TC    T LL  ',
              '     EE A EE LL  ',
              '     T    CTE    ',
              '      EEE EE     ',
              '     EETEE E     ',
              '                 ',
          ]
      },

      // roads
      {
          3: [
              '   .   .',
              '  . . . ',
              '   . .  ',
              '  . . . ',
              ' .   .  ',
          ],

          4: [
              '   .     .',
              '    .   . ',
              '   .....  ',
              '    . .   ',
              '   .....  ',
              '  .   .   ',
              '       .  ',
          ],

          6: [
              '          ',
              '   .     .',
              '    .   . ',
              '   ..... .',
              '    . .  .',
              '   .....  ',
              '  .   .   ',
              '       .  ',
              '          ',
          ],

          8: [
              '     . ..... ..  ',
              '    . .     .  . ',
              '    .  .   .    .',
              '    . ..... .  . ',
              '    .  . .  .  . ',
              '    . .....  ..  ',
              '     .   .  .    ',
              '    .     . .    ',
              '     ..... .     ',
          ]
      },

      // ramparts
      // {}
  ]
};
