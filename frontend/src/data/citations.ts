// Every citation this site makes, each verified against a primary source during the research pass.
//
// Two entries carry a correction that the usual short form gets wrong, and they are written the long way
// here on purpose. Hotelling (1947) is a CHAPTER in an edited volume whose title-page title is
// "Selected Techniques of Statistical Analysis", not a paper called "Multivariate Quality Control", and
// that chapter is not the origin of T-squared. Adams and MacKay (2007) is a PREPRINT with no venue: it
// has never been published in a proceedings or journal, and citing it as if it had is a common error.

import type { Citation } from '@fasl-work/caos-app-shell';

export const CITATIONS: Citation[] = [
  {
    id: 'page1954',
    label: 'Page 1954',
    citation: 'Page, E. S. "Continuous Inspection Schemes." Biometrika 41(1/2), 100-115 (1954).',
    doi: '10.1093/biomet/41.1-2.100',
  },
  {
    id: 'roberts1959',
    label: 'Roberts 1959',
    citation: 'Roberts, S. W. "Control Chart Tests Based on Geometric Moving Averages." '
      + 'Technometrics 1(3), 239-250 (1959).',
    doi: '10.1080/00401706.1959.10489860',
  },
  {
    id: 'shewhart1931',
    label: 'Shewhart 1931',
    citation: 'Shewhart, W. A. Economic Control of Quality of Manufactured Product. '
      + 'New York: D. Van Nostrand Company (1931). The 3-sigma limit and its economic argument are stated '
      + 'in the book; the common claim that it is the FIRST publication of the idea is unverified.',
  },
  {
    id: 'hotelling1947',
    label: 'Hotelling 1947',
    citation: 'Hotelling, Harold. "Multivariate Quality Control, Illustrated by the Air Testing of Sample '
      + 'Bombsights." Chapter 3 in Selected Techniques of Statistical Analysis for Scientific and '
      + 'Industrial Research and Production and Management Engineering, ed. Eisenhart, Hastay and Wallis. '
      + 'New York and London: McGraw-Hill (1947), pp. 111-184. Not the origin of T-squared, which '
      + 'Hotelling attributes to the generalized Student ratio on p. 114.',
  },
  {
    id: 'hinkley1971',
    label: 'Hinkley 1971',
    citation: 'Hinkley, D. V. "Inference about the change-point from cumulative sum tests." '
      + 'Biometrika 58(3), 509-523 (1971).',
    doi: '10.1093/biomet/58.3.509',
  },
  {
    id: 'jackson1979',
    label: 'Jackson and Mudholkar 1979',
    citation: 'Jackson, J. E., Mudholkar, G. S. "Control Procedures for Residuals Associated with '
      + 'Principal Component Analysis." Technometrics 21(3), 341-349 (1979).',
    doi: '10.1080/00401706.1979.10489779',
  },
  {
    id: 'kourti1996',
    label: 'Kourti and MacGregor 1996',
    citation: 'Kourti, T., MacGregor, J. F. "Multivariate SPC methods for process and product monitoring." '
      + 'Journal of Quality Technology 28(4), 409-428 (1996).',
    doi: '10.1080/00224065.1996.11979699',
  },
  {
    id: 'westerhuis2000',
    label: 'Westerhuis et al. 2000',
    citation: 'Westerhuis, J. A., Gurden, S. P., Smilde, A. K. "Generalized contribution plots in '
      + 'multivariate statistical process monitoring." Chemometrics and Intelligent Laboratory Systems '
      + '51(1), 95-114 (2000). Treats contribution SMEARING properly rather than presenting contributions '
      + 'as diagnosis.',
    doi: '10.1016/S0169-7439(00)00062-9',
  },
  {
    id: 'ku1995',
    label: 'Ku et al. 1995',
    citation: 'Ku, W., Storer, R. H., Georgakis, C. "Disturbance detection and isolation by dynamic '
      + 'principal component analysis." Chemometrics and Intelligent Laboratory Systems 30(1), 179-196 '
      + '(1995).',
    doi: '10.1016/0169-7439(95)00076-3',
  },
  {
    id: 'adams2007',
    label: 'Adams and MacKay 2007',
    citation: 'Adams, R. P., MacKay, D. J. C. "Bayesian Online Changepoint Detection." arXiv:0710.3742 '
      + '(2007). A PREPRINT: it has never been published in a peer-reviewed venue, despite being cited as '
      + 'though it had.',
    url: 'https://arxiv.org/abs/0710.3742',
  },
  {
    id: 'killick2012',
    label: 'Killick et al. 2012',
    citation: 'Killick, R., Fearnhead, P., Eckley, I. A. "Optimal Detection of Changepoints With a Linear '
      + 'Computational Cost." Journal of the American Statistical Association 107(500), 1590-1598 (2012).',
    doi: '10.1080/01621459.2012.737745',
  },
  {
    id: 'bifet2007',
    label: 'Bifet and Gavalda 2007',
    citation: 'Bifet, A., Gavalda, R. "Learning from Time-Changing Data with Adaptive Windowing." '
      + 'Proceedings of the 2007 SIAM International Conference on Data Mining, 443-448 (2007). '
      + 'Theorem 3.1 is stated for the DIRECT algorithm, which is the one implemented here; ADWIN2 is the '
      + 'efficiency variant.',
    doi: '10.1137/1.9781611972771.42',
  },
  {
    id: 'raab2020',
    label: 'Raab et al. 2020',
    citation: 'Raab, C., Heusinger, M., Schleif, F.-M. "Reactive Soft Prototype Computing for Concept '
      + 'Drift Streams." Neurocomputing 416, 340-351 (2020). Introduces KSWIN.',
    doi: '10.1016/j.neucom.2019.11.111',
  },
  {
    id: 'yeh2017',
    label: 'Yeh et al. 2017',
    citation: 'Yeh, C.-C. M., Kavantzas, N., Keogh, E. "Matrix Profile VI: Meaningful Multidimensional '
      + 'Motif Discovery." IEEE ICDM 2017, 565-574. The mSTAMP matching subset.',
    doi: '10.1109/ICDM.2017.66',
  },
  {
    id: 'liu2008',
    label: 'Liu et al. 2008',
    citation: 'Liu, F. T., Ting, K. M., Zhou, Z.-H. "Isolation Forest." IEEE ICDM 2008, 413-422.',
    doi: '10.1109/ICDM.2008.17',
  },
  {
    id: 'scholkopf2001',
    label: 'Scholkopf et al. 2001',
    citation: 'Scholkopf, B., Platt, J. C., Shawe-Taylor, J., Smola, A. J., Williamson, R. C. "Estimating '
      + 'the Support of a High-Dimensional Distribution." Neural Computation 13(7), 1443-1471 (2001).',
    doi: '10.1162/089976601750264965',
  },
  {
    id: 'vovk2005',
    label: 'Vovk et al. 2005',
    citation: 'Vovk, V., Gammerman, A., Shafer, G. Algorithmic Learning in a Random World. Springer '
      + '(2005). Inductive conformal predictors: Chapter 4, Section 4.1, p. 98.',
    doi: '10.1007/b106715',
  },
  {
    id: 'gibbs2021',
    label: 'Gibbs and Candes 2021',
    citation: 'Gibbs, I., Candes, E. J. "Adaptive Conformal Inference Under Distribution Shift." '
      + 'NeurIPS 34 (2021), 1660-1672.',
    url: 'https://arxiv.org/abs/2106.00170',
  },
  {
    id: 'saxena2008',
    label: 'Saxena et al. 2008',
    citation: 'Saxena, A., Goebel, K., Simon, D., Eklund, N. "Damage propagation modeling for aircraft '
      + 'engine run-to-failure simulation." IEEE PHM 2008, 1-9. The C-MAPSS turbofan dataset.',
    doi: '10.1109/PHM.2008.4711414',
  },
  {
    id: 'aps2016',
    label: 'SCANIA APS 2016',
    citation: 'IDA 2016 Industrial Challenge: APS Failure at Scania Trucks. UCI Machine Learning '
      + 'Repository. The cost matrix (FP = 10, FN = 500) is primary-verified in the dataset\'s own '
      + 'aps_failure_description.txt, as is the winning entry at 9,920.',
    doi: '10.24432/C51S51',
  },
  {
    id: 'componentx2024',
    label: 'SCANIA Component X 2024',
    citation: 'SCANIA Component X: a multivariate time-series dataset for predictive maintenance. '
      + 'Swedish National Data Service (2024). 1,122,452 readouts over 23,550 vehicles, with a graded '
      + '5x5 cost matrix. Downloadable anonymously.',
    doi: '10.5878/jvb5-d390',
  },
  {
    id: 'carpentier2024',
    label: 'Carpentier et al.',
    citation: 'Carpentier, L., et al. "Anomaly Detection for Predictive Maintenance in Heavy-Duty Trucks." '
      + 'Their "contextual" model partitions the FLEET into per-vehicle cohorts by specification; the '
      + 'regime conditioning here partitions the TIMELINE. The two compose and do not overlap.',
  },
];
